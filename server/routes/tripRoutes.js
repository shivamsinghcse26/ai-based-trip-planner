const express = require("express");
const crypto = require("crypto");
const { OpenAI } = require("openai");

const SharedTrip = require("../models/SharedTrip");
const SavedTrip = require("../models/SavedTrip");

const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const apiKey =
  process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY or OPENROUTER_API_KEY");
}

console.log("TripRoutes API key loaded, length:", apiKey.length);

const client = new OpenAI({
  apiKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "AI Travel Planner",
  },
});


// ============================
// GENERATE TRIP
// ============================

router.post("/generate-trip", async (req, res) => {
  try {
    const {
      destination,
      budget,
      days,
      interest,
    } = req.body;

    const prompt = `
Generate a detailed ${days}-day travel itinerary for ${destination}.

Budget: ₹${budget}

Interest: ${interest}

Return only plain text in the following format:

Day 1: <short day summary and food + hotel recommendations>
Day 2: <short day summary and food + hotel recommendations>
Day 3: <short day summary and food + hotel recommendations>

- Do not include any repeated summaries or rewritten versions.
- Do not include additional explanation after the final day.
- Keep each day concise and avoid long multi-paragraph prose.
- Use simple sentences and bullet-style items if needed.
`;

    const completion =
      await client.chat.completions.create({
        model: "meta-llama/llama-3-8b-instruct",

        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const rawPlan =
      completion.choices[0].message.content;

    const normalizedPlan = rawPlan
      .replace(/\*\*/g, "")
      .replace(/^\s*\*\s*/gm, "* ")
      .replace(/\n{2,}/g, "\n")
      .trim();

    const tripPlan = normalizedPlan
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(
        (line, index, arr) =>
          line.length > 0 ||
          (index > 0 && line !== arr[index - 1])
      )
      .join("\n");

    const isMetadataHeading = (line) => {
      return /^(?:[\*\-•]\s*)?\s*(?:hotels?|hotel suggestions?|accommodation|stay|lodging|food recommendations?|food recommendation|dining|restaurant|meal|travel tips?|tips|estimated expenses?|estimated expense|budget breakdown|total estimated expenses?|costs?|expenses?|budget):?/i.test(
        line
      );
    };

    const extractContentAndMetadata = (text) => {
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const contentLines = [];
      const metadataLines = [];

      let collectingMetadata = false;

      for (const line of lines) {
        if (
          !collectingMetadata &&
          isMetadataHeading(line)
        ) {
          collectingMetadata = true;
        }

        if (collectingMetadata) {
          metadataLines.push(line);
        } else {
          contentLines.push(line);
        }
      }

      return {
        content: contentLines.join("\n").trim(),
        metadata: metadataLines.join("\n").trim(),
      };
    };

    const daySections = [];

    const dayBlockRegex =
      /(?:^|\n)[\s\*\-]*Day\s+(\d+):([\s\S]*?)(?=(?:\n[\s\*\-]*Day\s+\d+:)|$)/gi;

    let match;

    while (
      (match = dayBlockRegex.exec(tripPlan)) !== null
    ) {
      const dayNumber = Number(match[1]);

      const rawContent = match[2]
        .trim()
        .replace(/^[\s\*\-:]*/g, "");

      const { content, metadata } =
        extractContentAndMetadata(rawContent);

      daySections.push({
        day: dayNumber,
        content,
        metadata,
      });
    }

    if (daySections.length === 0) {
      daySections.push({
        day: 1,
        content: tripPlan.trim(),
        metadata: "",
      });
    }

    const uniqueSections = Array.from(
      daySections
        .reduce((map, section) => {
          if (!map.has(section.day)) {
            map.set(section.day, section);
          }

          return map;
        }, new Map())
        .values()
    ).sort((a, b) => a.day - b.day);

    const introSignals = [
      /given your interest/i,
      /land of/i,
      /travel itinerary/i,
      /curated a/i,
      /get ready/i,
      /best culinary/i,
      /welcome to/i,
      /within a budget/i,
    ];

    const isIntro = (text) => {
      const normalized = text.toLowerCase();

      const introCount = introSignals.reduce(
        (count, regex) =>
          count + (regex.test(normalized) ? 1 : 0),
        0
      );

      return (
        introCount > 0 &&
        text.split(/\n/).length < 5
      );
    };

    let destinationIntro = null;

    let finalSections = uniqueSections;

    if (
      uniqueSections.length > 1 &&
      isIntro(uniqueSections[0].content)
    ) {
      destinationIntro =
        uniqueSections[0].content;

      finalSections =
        uniqueSections.slice(1).map(
          (section, index) => ({
            ...section,
            day: index + 1,
          })
        );
    }

    const metadata = finalSections
      .map((section) => section.metadata || "")
      .filter(Boolean)
      .join("\n")
      .trim();

    res.json({
      tripPlan,
      raw: tripPlan,
      itinerary: finalSections,
      destinationIntro,
      metadata,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: error.message,
    });

  }
});


// ============================
// GET ALL SAVED TRIPS
// ============================

router.get(
  "/saved",
  requireAuth,
  async (req, res) => {
    try {
      const savedTrips = await SavedTrip.find({ userId: req.user.userId }).sort({ createdAt: -1 });
      res.json(savedTrips);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  }
);

// ============================
// CREATE SAVED TRIP
// ============================
router.post(
  "/saved",
  requireAuth,
  async (req, res) => {
    try {
      const { formData, tripPlan } = req.body || {};

      // Basic validation
      if (!formData || !tripPlan) {
        return res.status(400).json({ message: "formData and tripPlan are required" });
      }

      const savedTrip = await SavedTrip.create({
        userId: req.user.userId,
        destination: formData.destination,
        budget: formData.budget,
        days: formData.days,
        interest: formData.interest,
        formData,
        tripPlan,
        tags: [],
        favorite: false,
      });

      return res.status(201).json({ savedTripId: savedTrip._id, savedTrip });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  }
  );

// ============================
// CREATE SAVED TRIP (alias for frontend)
router.post(
  "/save",
  requireAuth,
  async (req, res) => {
    try {
      const { formData, tripPlan } = req.body || {};
      if (!formData || !tripPlan) {
        return res.status(400).json({ message: "formData and tripPlan are required" });
      }
      const savedTrip = await SavedTrip.create({
        userId: req.user.userId,
        destination: formData.destination,
        budget: formData.budget,
        days: formData.days,
        interest: formData.interest,
        formData,
        tripPlan,
        tags: [],
        favorite: false,
      });
      return res.status(201).json({ savedTripId: savedTrip._id, savedTrip });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  }
);

// ============================
// DELETE SAVED TRIP
// ============================

router.delete(
  "/saved/:id",
  requireAuth,
  async (req, res) => {
    try {

      const { id } = req.params;

      const deleted =
        await SavedTrip.findOneAndDelete({
          _id: id,
          userId: req.user.userId,
        });

      if (!deleted) {
        return res.status(404).json({
          message: "Saved trip not found",
        });
      }

      res.json({
        deleted: true,
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// ============================
// CREATE SHAREABLE LINK
// ============================

router.post(
  "/share",
  requireAuth,
  async (req, res) => {
    try {

      const { savedTripId } = req.body || {};

      if (!savedTripId) {
        return res.status(400).json({
          message: "savedTripId is required",
        });
      }

      // Verify ownership
      const savedTrip =
        await SavedTrip.findOne({
          _id: savedTripId,
          userId: req.user.userId,
        });

      if (!savedTrip) {
        return res.status(404).json({
          message: "Saved trip not found",
        });
      }

      // Generate short token
      const token = crypto
        .randomBytes(6)
        .toString("hex");

      const shared =
        await SharedTrip.create({
          savedTripId: savedTrip._id,
          token,
        });

      const frontUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:5173";

      const shareUrl =
        `${frontUrl}/share/${shared.token}`;

      res.json({
        url: shareUrl,
        token: shared.token,
      });

    } catch (error) {

      console.log("SHARE error", error);

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// ============================
// UPDATE SAVED TRIP
// ============================

router.patch(
  "/saved/:id",
  requireAuth,
  async (req, res) => {
    try {

      const { id } = req.params;

      const { favorite, tags } = req.body;

      const update = {};

      if (typeof favorite !== "undefined") {
        update.favorite = favorite;
      }

      if (Array.isArray(tags)) {
        update.tags = tags;
      }

      const updatedTrip =
        await SavedTrip.findOneAndUpdate(
          {
            _id: id,
            userId: req.user.userId,
          },
          {
            $set: update,
          },
          {
            new: true,
          }
        );

      if (!updatedTrip) {
        return res.status(404).json({
          message: "Saved trip not found",
        });
      }

      res.json(updatedTrip);

    } catch (error) {

      console.log("PATCH SAVED error", error);

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// ============================
// GET SHARED TRIP
// ============================

router.get(
  "/share/:token",
  async (req, res) => {
    try {

      const { token } = req.params;

      const shared =
        await SharedTrip.findOne({
          token,
        }).populate("savedTripId");

      if (!shared) {
        return res.status(404).json({
          message: "Shared link not found",
        });
      }

      // Optional expiry
      if (
        shared.expiresAt &&
        new Date() > shared.expiresAt
      ) {
        return res.status(410).json({
          message: "Shared link has expired",
        });
      }

      const savedTrip = shared.savedTripId;

      res.json({
        savedTrip,
      });

    } catch (error) {

      console.log("GET SHARE error", error);

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// ============================
// GET SINGLE SAVED TRIP
// ============================

router.get(
  "/saved/:id",
  requireAuth,
  async (req, res) => {
    try {

      const { id } = req.params;

      const savedTrip =
        await SavedTrip.findOne({
          _id: id,
          userId: req.user.userId,
        });

      if (!savedTrip) {
        return res.status(404).json({
          message: "Saved trip not found",
        });
      }

      // PDF Export
      if (req.query.format === "pdf") {
        console.log('[tripRoutes] PDF requested', { savedTripId: savedTrip?._id, destination: savedTrip?.destination, days: savedTrip?.days });

        console.log(
  "PDF PATH:",
  require.resolve("../utils/pdfGenerator")
);

const pdfGenerator =
  require("../utils/pdfGenerator");

        const pdfBuffer =
          await pdfGenerator.generateTripPDF(
            savedTrip
          );

        console.log('[tripRoutes] PDF generated bytes', pdfBuffer?.length);

        res.set({
          "Content-Type": "application/pdf",
          "Content-Disposition":
            `attachment; filename="${savedTrip.destination || "trip"}.pdf"`,
        });

        return res.send(pdfBuffer);
      }

      // CSV Export
      if (req.query.format === "csv") {

        const csvGenerator =
          require("../utils/csvGenerator");

        const csvContent =
          await csvGenerator.generateTripCSV(
            savedTrip
          );

        res.set({
          "Content-Type": "text/csv",
          "Content-Disposition":
            `attachment; filename="${savedTrip.destination || "trip"}.csv"`,
        });

        return res.send(csvContent);
      }

      res.json(savedTrip);

    } catch (error) {

      console.log("GET SAVED error", error);

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


module.exports = router;