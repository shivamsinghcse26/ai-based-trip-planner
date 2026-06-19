const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

async function generateTripPDF(savedTrip) {
  console.log("[pdfGenerator] generateTripPDF called", {
    destination: savedTrip?.destination,
    budget: savedTrip?.budget,
    days: savedTrip?.days,
    hasTripPlan: !!savedTrip?.tripPlan,
    tripPlanType: typeof savedTrip?.tripPlan,
  });

  console.log(
    "[pdfGenerator] FULL TRIP PLAN:",
    JSON.stringify(savedTrip?.tripPlan, null, 2)
  );

  const pdfDoc = await PDFDocument.create();

  let page = pdfDoc.addPage();
  let { height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(
    StandardFonts.HelveticaBold
  );

  const margin = 50;
  const lineHeight = 15;

  let y = height - margin;

  const safe = (text) =>
    String(text || "")
      .replace(/₹/g, "INR ")
      .replace(/[\u0000-\u001f]/g, "");

  const writeLine = (
    text,
    size = 11,
    fontRef = font
  ) => {
    if (y < 50) {
      page = pdfDoc.addPage();
      height = page.getSize().height;
      y = height - margin;
    }

    page.drawText(safe(text), {
      x: margin,
      y,
      size,
      font: fontRef,
      color: rgb(0, 0, 0),
    });

    y -= lineHeight;
  };

  // Header
  writeLine("AI Travel Planner", 20, bold);
  y -= 10;

  writeLine(
    `Destination: ${savedTrip.destination}`
  );
  writeLine(`Budget: ${savedTrip.budget}`);
  writeLine(`Days: ${savedTrip.days}`);
  writeLine(
    `Interest: ${savedTrip.interest}`
  );

  y -= 20;

  writeLine("ITINERARY", 16, bold);

  const tripPlan = savedTrip.tripPlan;

  // CASE 1: itinerary array exists
  if (
    tripPlan &&
    Array.isArray(tripPlan.itinerary)
  ) {
    for (const day of tripPlan.itinerary) {
      y -= 10;

      writeLine(
        `Day ${day.day}`,
        14,
        bold
      );

      const content = String(
        day.content || ""
      );

      const lines = content.split("\n");

      for (const line of lines) {
        if (line.trim()) {
          writeLine(line);
        }
      }

      if (day.metadata) {
        writeLine(
          `Notes: ${day.metadata}`
        );
      }
    }
  }

  // CASE 2: fallback
  else {
    const text = JSON.stringify(
      tripPlan,
      null,
      2
    );

    const lines = text.split("\n");

    for (const line of lines) {
      writeLine(line);
    }
  }

  y -= 20;

  writeLine(
    `Generated: ${new Date().toLocaleString()}`,
    9
  );

  const pdfBytes = await pdfDoc.save();

  return Buffer.from(pdfBytes);
}

module.exports = {
  generateTripPDF,
};