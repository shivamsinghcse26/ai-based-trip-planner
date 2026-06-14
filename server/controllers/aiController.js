const { GoogleGenerativeAI } = require("@google/generative-ai");




// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// @desc    Generate AI-powered trip itinerary
// @route   POST /api/ai/generate-itinerary
// @access  Private
const generateItinerary = async (req, res) => {
  console.log("Received itinerary generation request with data:", req.body);
  try {
    const {
      destination,
      duration,
      budget,
      travelStyle,
      interests,
      groupSize,
      accommodation,
      transport,
      startDate,
      endDate,
    } = req.body;
const safeBudget = budget || {
  min: 0,
  max: 5000,
  currency: "INR",
};
   

    // Create detailed prompt for Gemini
    const prompt = `Create a detailed ${duration}-day travel itinerary for ${destination} with the following preferences:

Travel Style: ${travelStyle || "balanced"}
Budget Range: ₹${safeBudget.min} - ₹${safeBudget.max} ${
      safeBudget.currency || "INR"
    }
Group Size: ${groupSize || 1} people
Accommodation Preference: ${accommodation || "hotel"}
Transport Preferences: ${transport?.join(", ") || "flexible"}
Interests: ${interests?.join(", ") || "general sightseeing"}
Start Date: ${startDate || "flexible"}
End Date: ${endDate || "flexible"}

Please provide a detailed day-by-day itinerary in the following JSON format:
{
  "destination": "${destination}",
  "duration": ${duration},
  "totalEstimatedCost": {
    "amount": 0,
    "currency": "${safeBudget.currency || "INR"}"
  },
  "itinerary": [
    {
      "day": 1,
      "date": "2025-11-15",
      "title": "Arrival, Iconic Views & Cultural Introduction",
      "activities": [
        {
          "time": "09:00",
          "activity": "Arrival and Hotel Check-in",
          "location": {
            "name": "Hotel Name",
            "address": "Hotel Address",
            "coordinates": {
              "lat": 0.0,
              "lng": 0.0
            }
          },
          "duration": 2,
          "cost": {
            "amount": 150,
            "currency": "INR"
          },
          "description": "Check into hotel and freshen up",
          "type": "accommodation"
        }
      ],
      "meals": [
        {
          "time": "12:00",
          "restaurant": "Restaurant Name",
          "cuisine": "Local",
          "cost": {
            "amount": 25,
            "currency": "INR"
          },
          "location": {
            "name": "Restaurant Name",
            "address": "Restaurant Address"
          }
        }
      ],
      "totalDayCost": {
        "amount": 175,
        "currency": "INR"
      }
    }
  ],
  "recommendations": {
    "bestTimeToVisit": "November to March",
    "weather": "Pleasant and mild",
    "localTips": [
      "Carry local currency",
      "Dress modestly when visiting religious sites"
    ],
    "mustSeeAttractions": [
      "Main attraction 1",
      "Main attraction 2"
    ],
    "budgetTips": [
      "Use public transport",
      "Eat at local restaurants"
    ],
    "safetyTips": [
      "Keep copies of important documents",
      "Stay aware of your surroundings"
    ]
  }
}

IMPORTANT: For each day in the itinerary, generate a creative and descriptive "title" that summarizes the theme and main highlights of that day. The title should be concise (3-6 words) and capture the essence of the day's activities.

Examples of good day titles:
- "Arrival, Iconic Views & Seine Cruise"
- "Art, Grandeur & Shopping"
- "Impressionist Art, Latin Quarter & Bohemian Montmartre"
- "Historical Monuments & Local Culture"
- "Beach Relaxation & Water Sports"
- "Mountain Adventures & Scenic Views"

Make sure to include realistic costs, actual attractions, restaurants, and locations for ${destination}. Provide specific addresses and coordinates where possible. The total cost should fit within the budget range of $${
      safeBudget.min
    } - $${safeBudget.max}.`;

   

    // Generate content using Gemini
const generateWithRetry = async (prompt) => {
  let retries = 3;

  while (retries > 0) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      if (
        error.status === 503 ||
        error.status === 500
      ) {
        retries--;

        if (retries === 0) throw error;

        await new Promise((resolve) =>
          setTimeout(resolve, 3000)
        );
      } else {
        throw error;
      }
    }
  }
}


const result = await generateWithRetry(prompt);
    const response = await result.response;
    let generatedText = response.text();

    // Clean up the response - remove markdown formatting if present
    generatedText = generatedText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "");

    // Parse the JSON response
    let itineraryData;
    try {
      itineraryData = JSON.parse(generatedText);
      
    
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback: create a basic structure if JSON parsing fails
      itineraryData = {
        destination,
        duration,
        totalEstimatedCost: {
          amount: safeBudget.max || 1000,
          currency: safeBudget.currency || "INR",
        },
        itinerary: [],
        recommendations: {
          bestTimeToVisit: "Year-round",
          weather: "Varies by season",
          localTips: ["Research local customs", "Learn basic phrases"],
          mustSeeAttractions: ["Top attraction in " + destination],
          budgetTips: ["Use public transport", "Eat at local places"],
          safetyTips: ["Keep documents safe", "Stay alert"],
        },
      };
    }

    // Validate and enhance the itinerary data
    if (!itineraryData.itinerary || itineraryData.itinerary.length === 0) {
      // Create basic itinerary if none provided
      const basicItinerary = [];
      for (let day = 1; day <= duration; day++) {
        basicItinerary.push({
          day,
          date: startDate
            ? new Date(
                new Date(startDate).getTime() + (day - 1) * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split("T")[0]
            : `Day ${day}`,
          theme: `Day ${day} in ${destination}`,
          activities: [
            {
              time: "09:00",
              activity: `Explore ${destination} - Day ${day}`,
              location: {
                name: destination,
                address: `${destination} city center`,
                coordinates: { lat: 0, lng: 0 },
              },
              duration: 4,
              cost: {
                amount: Math.round(safeBudget.max / duration / 2),
                currency: safeBudget.currency || "INR",
              },
              description: `Guided tour and exploration of ${destination}`,
              type: "attraction",
              bookingRequired: false,
            },
          ],
          meals: [
            {
              time: "12:00",
              restaurant: `Local Restaurant Day ${day}`,
              cuisine: "Local",
              cost: { amount: 30, currency: safeBudget.currency || "INR" },
              location: {
                name: `Restaurant in ${destination}`,
                address: `${destination} dining district`,
              },
            },
          ],
          totalDayCost: {
            amount: Math.round(safeBudget.max / duration),
            currency: safeBudget.currency || "INR",
          },
        });
      }
      itineraryData.itinerary = basicItinerary;
    }

    // Calculate total cost if not provided
    if (
      !itineraryData.totalEstimatedCost ||
      itineraryData.totalEstimatedCost.amount === 0
    ) {
      const totalCost = itineraryData.itinerary.reduce((sum, day) => {
        return sum + (day.totalDayCost?.amount || 0);
      }, 0);
      itineraryData.totalEstimatedCost = {
        amount: totalCost,
        currency: safeBudget.currency || "INR",
      };
    }

    res.json({
      success: true,
      message: "Itinerary generated successfully",
      data: itineraryData,
    });
  } catch (error) {
    console.error("Generate itinerary error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({
      success: false,
      message: "Error generating itinerary with AI",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Optimize existing itinerary
// @route   POST /api/ai/optimize-itinerary
// @access  Private
const optimizeItinerary = async (req, res) => {
  try {
    const { itinerary, optimizationGoals } = req.body;  

    if (!itinerary) {
      return res.status(400).json({
        success: false,
        message: "Itinerary data is required for optimization",
      });
    }

    const goals = optimizationGoals || ["cost", "time", "experience"];

    const prompt = `Optimize the following travel itinerary based on these goals: ${goals.join(
      ", "
    )}.

Current Itinerary:
${JSON.stringify(itinerary, null, 2)}

Please provide an optimized version that:
1. ${
      goals.includes("cost")
        ? "Reduces overall costs while maintaining quality"
        : ""
    }
2. ${
      goals.includes("time")
        ? "Optimizes travel time and reduces unnecessary delays"
        : ""
    }
3. ${
      goals.includes("experience")
        ? "Enhances the overall travel experience"
        : ""
    }
4. Maintains the same destination and duration
5. Keeps the same JSON structure

Return the optimized itinerary in the same JSON format with explanations for key changes in an "optimizationNotes" field.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let optimizedText = response.text();

    // Clean up the response
    optimizedText = optimizedText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "");

    let optimizedData;
    try {
      optimizedData = JSON.parse(optimizedText);
    } catch (parseError) {
      console.error("Failed to parse optimization response:", parseError);
      // Return original itinerary with basic optimization notes
      optimizedData = {
        ...itinerary,
        optimizationNotes: [
          "Optimization completed",
          "Cost-effective options prioritized",
          "Travel time optimized",
        ],
      };
    }

    res.json({
      success: true,
      message: "Itinerary optimized successfully",
      data: optimizedData,
    });
  } catch (error) {
    console.error("Optimize itinerary error:", error);
    res.status(500).json({
      success: false,
      message: "Error optimizing itinerary",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Get travel suggestions based on preferences
// @route   POST /api/ai/travel-suggestions
// @access  Private
const getTravelSuggestions = async (req, res) => {
  try {
    const { preferences, currentLocation, travelHistory } = req.body;

    const user = req.user;
    const userPreferences = user.preferences || {};

    const prompt = `Based on the following user profile and preferences, suggest 5-10 travel destinations:

User Preferences:
- Travel Style: ${
      preferences?.travelStyle || userPreferences.travelStyle || "balanced"
    }
- Budget Range: ${
      preferences?.budgetRange || userPreferences.budgetRange || "moderate"
    }
- Preferred Activities: ${
      preferences?.interests || userPreferences.interests || ["sightseeing"]
    }
- Accommodation Type: ${
      preferences?.accommodation ||
      userPreferences.preferredAccommodation ||
      "hotel"
    }
- Current Location: ${currentLocation || "Not specified"}
- Previous Destinations: ${
      travelHistory?.map((trip) => trip.destination).join(", ") || "None"
    }

Please provide suggestions in the following JSON format:
{
  "suggestions": [
    {
      "destination": "Destination Name",
      "country": "Country",
      "category": "beach/mountain/city/cultural/adventure",
      "estimatedBudget": {
        "min": 60000,
        "max": 120000,
        "currency": "INR"
      },
      "bestTimeToVisit": "March to May",
      "highlights": [
        "Main attraction 1",
        "Main attraction 2",
        "Main attraction 3"
      ],
      "whyRecommended": "Specific reasons based on user preferences",
      "estimatedDuration": "5-7 days",
      "difficultyLevel": "easy/moderate/challenging",
      "uniqueExperiences": [
        "Unique experience 1",
        "Unique experience 2"
      ]
    }
  ],
  "personalizedTips": [
    "Tip based on travel style",
    "Budget optimization tip",
    "Experience enhancement tip"
  ]
}

Focus on destinations that match the user's travel style and haven't been visited before.`;

  
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let suggestionsText = response.text();

    // Clean up the response
    suggestionsText = suggestionsText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "");

    let suggestionsData;
    try {
      suggestionsData = JSON.parse(suggestionsText);
    } catch (parseError) {
      console.error("Failed to parse suggestions response:", parseError);
      // Fallback suggestions
      suggestionsData = {
        suggestions: [
          {
            destination: "Paris",
            country: "France",
            category: "cultural",
            estimatedBudget: { min: 80000, max: 160000, currency: "INR" },
            bestTimeToVisit: "April to June",
            highlights: ["Eiffel Tower", "Louvre Museum", "Notre-Dame"],
            whyRecommended:
              "Perfect for cultural exploration and romantic atmosphere",
            estimatedDuration: "5-7 days",
            difficultyLevel: "easy",
            uniqueExperiences: [
              "Seine River cruise",
              "Montmartre art district",
            ],
          },
        ],
        personalizedTips: [
          "Book accommodations in advance for better rates",
          "Use public transport to save money",
          "Try local cuisines for authentic experience",
        ],
      };
    }

    res.json({
      success: true,
      message: "Travel suggestions generated successfully",
      data: suggestionsData,
    });
  } catch (error) {
    console.error("Get travel suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating travel suggestions",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Generate destination insights
// @route   POST /api/ai/destination-insights
// @access  Private
const getDestinationInsights = async (req, res) => {
  try {
    const { destination, travelDates } = req.body;

    if (!destination) {
      return res.status(400).json({
        success: false,
        message: "Destination is required",
      });
    }

    const prompt = `Provide comprehensive travel insights for ${destination} for travel dates: ${
      travelDates || "flexible"
    }. 

Include the following information in JSON format:
{
  "destination": "${destination}",
  "overview": "Brief description of the destination",
  "weather": {
    "currentSeason": "season name",
    "averageTemperature": "temperature range",
    "rainfall": "rainfall info",
    "bestMonths": ["month1", "month2"]
  },
  "costOfLiving": {
    "level": "low/moderate/high",
    "averageMealCost": "cost range",
    "accommodation": "price range",
    "transport": "cost info"
  },
  "culture": {
    "language": "primary language",
    "currency": "local currency",
    "religion": "primary religion",
    "customs": ["custom1", "custom2"],
    "etiquette": ["tip1", "tip2"]
  },
  "topAttractions": [
    {
      "name": "Attraction name",
      "type": "museum/landmark/nature",
      "description": "brief description",
      "averageVisitTime": "time needed"
    }
  ],
  "localCuisine": [
    {
      "dish": "dish name",
      "description": "what it is",
      "where": "where to find it"
    }
  ],
  "transportation": {
    "publicTransport": "description",
    "ridesharing": "availability",
    "walkability": "walkability score",
    "tips": ["tip1", "tip2"]
  },
  "safety": {
    "level": "low/moderate/high risk",
    "commonIssues": ["issue1", "issue2"],
    "tips": ["safety tip1", "safety tip2"]
  },
  "packingTips": ["item1", "item2", "item3"]
}`;


    const result = await model.generateContent(prompt);
    const response = await result.response;
    let insightsText = response.text();

    // Clean up the response
    insightsText = insightsText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "");

    let insightsData;
    try {
      insightsData = JSON.parse(insightsText);
    } catch (parseError) {
      console.error("Failed to parse insights response:", parseError);
      // Fallback insights
      insightsData = {
        destination,
        overview: `${destination} is a popular travel destination with rich culture and attractions.`,
        weather: {
          currentSeason: "varies",
          averageTemperature: "varies by season",
          rainfall: "moderate",
          bestMonths: ["spring", "fall"],
        },
        costOfLiving: {
          level: "moderate",
          averageMealCost: "$15-30",
          accommodation: "$50-150/night",
          transport: "$5-15/day",
        },
        topAttractions: [
          {
            name: `Main attraction in ${destination}`,
            type: "landmark",
            description: "Must-see attraction",
            averageVisitTime: "2-3 hours",
          },
        ],
        safety: {
          level: "low risk",
          tips: ["Keep valuables safe", "Be aware of surroundings"],
        },
      };
    }

    res.json({
      success: true,
      message: "Destination insights generated successfully",
      data: insightsData,
    });
  } catch (error) {
    console.error("Get destination insights error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating destination insights",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Get AI-powered trip recommendations
// @route   GET /api/ai/recommendations
// @route   POST /api/ai/recommendations/refresh (clears cache)
// @access  Private
const getRecommendations = async (req, res) => {
  try {
    // Use dummy recommendations instead of AI
    const recommendations = getDummyRecommendations();

    // recommendations generated

    res.status(200).json({
      success: true,
      data: recommendations,
      refreshed: req.method === "POST",
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Helper: Get random dummy recommendations from a list of 15 destinations
function getDummyRecommendations() {
  const allDestinations = [
    {
      destination: "Paris, France",
      highlights: "Eiffel Tower, Louvre Museum, Seine River Cruise",
      duration: 5,
      estimatedCost: { min: 80000, max: 150000, currency: "INR" },
    },
    {
      destination: "Tokyo, Japan",
      highlights: "Mount Fuji, Ancient Temples, Cherry Blossoms",
      duration: 6,
      estimatedCost: { min: 90000, max: 180000, currency: "INR" },
    },
    {
      destination: "Bali, Indonesia",
      highlights: "Pristine Beaches, Sacred Temples, Rice Terraces",
      duration: 4,
      estimatedCost: { min: 40000, max: 80000, currency: "INR" },
    },
    {
      destination: "Dubai, UAE",
      highlights: "Burj Khalifa, Desert Safari, Luxury Shopping",
      duration: 4,
      estimatedCost: { min: 60000, max: 120000, currency: "INR" },
    },
    {
      destination: "Goa, India",
      highlights: "Golden Beaches, Portuguese Heritage, Vibrant Nightlife",
      duration: 3,
      estimatedCost: { min: 15000, max: 35000, currency: "INR" },
    },
    {
      destination: "Maldives",
      highlights: "Overwater Villas, Coral Reefs, Luxury Resorts",
      duration: 5,
      estimatedCost: { min: 100000, max: 250000, currency: "INR" },
    },
    {
      destination: "Santorini, Greece",
      highlights: "White-washed Buildings, Sunset Views, Aegean Sea",
      duration: 4,
      estimatedCost: { min: 70000, max: 140000, currency: "INR" },
    },
    {
      destination: "New York, USA",
      highlights: "Statue of Liberty, Times Square, Central Park",
      duration: 6,
      estimatedCost: { min: 120000, max: 220000, currency: "INR" },
    },
    {
      destination: "Jaipur, India",
      highlights: "Pink City, Amber Fort, Royal Palaces",
      duration: 3,
      estimatedCost: { min: 12000, max: 30000, currency: "INR" },
    },
    {
      destination: "Barcelona, Spain",
      highlights: "Sagrada Familia, Gothic Quarter, Mediterranean Beaches",
      duration: 5,
      estimatedCost: { min: 75000, max: 145000, currency: "INR" },
    },
    {
      destination: "Singapore",
      highlights: "Marina Bay Sands, Gardens by the Bay, Hawker Centers",
      duration: 4,
      estimatedCost: { min: 55000, max: 110000, currency: "INR" },
    },
    {
      destination: "Kerala, India",
      highlights: "Backwaters, Hill Stations, Ayurvedic Retreats",
      duration: 5,
      estimatedCost: { min: 20000, max: 45000, currency: "INR" },
    },
    {
      destination: "London, England",
      highlights: "Big Ben, British Museum, Thames River",
      duration: 5,
      estimatedCost: { min: 95000, max: 175000, currency: "INR" },
    },
    {
      destination: "Phuket, Thailand",
      highlights: "Tropical Beaches, Island Hopping, Thai Cuisine",
      duration: 5,
      estimatedCost: { min: 45000, max: 90000, currency: "INR" },
    },
    {
      destination: "Manali, India",
      highlights: "Snow-capped Mountains, Adventure Sports, Himalayan Views",
      duration: 4,
      estimatedCost: { min: 18000, max: 40000, currency: "INR" },
    },
  ];

  // Randomly shuffle and return 3 destinations
  return allDestinations
    .sort(() => 0.5 - Math.random()).slice(0, 3);
    
}

module.exports = {
  generateItinerary,
  optimizeItinerary,
  getTravelSuggestions,
  getDestinationInsights,
  getRecommendations,
};