import OpenAI from "openai";
import { generatePrompt, extractKnowledgeBase } from "./knowledge";
import { shouldOfferMaintenanceDetail, getMaintenanceDetailRecommendation, mightNeedDeeperCleaning } from "./maintenanceDetail";
import { customerMemory } from "./customerMemory";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate an AI response to a user query
 */
export async function generateAIResponse(userMessage: string, phoneNumber: string, platform: "sms" | "web" = "web") {
  try {
    const prompt = generatePrompt(userMessage);
    const knowledgeBase = extractKnowledgeBase();
    
    // Check if the customer should be offered the maintenance detail program
    const offerMaintenanceDetail = shouldOfferMaintenanceDetail(phoneNumber, userMessage);
    
    // Check if customer might need deeper cleaning instead
    const needsDeeperCleaning = mightNeedDeeperCleaning(userMessage);
    
    // Determine if this is a repeat customer
    const customerInfo = phoneNumber ? customerMemory.getCustomer(phoneNumber) : null;
    const isRepeatCustomer = customerInfo && customerInfo.serviceHistory && customerInfo.serviceHistory.length > 0;
    
    // Prepare special instructions about maintenance detail
    let maintenanceDetailInstructions = "";
    if (offerMaintenanceDetail && !needsDeeperCleaning) {
      maintenanceDetailInstructions = `
      This customer is a good candidate for the Maintenance Detail Program.
      Make sure to mention our Maintenance Detail Program in your response.
      The program consists of a quick wipe down, window cleaning, and wash/wax to maintain their vehicle.
      Emphasize this is ideal for vehicles that are already in good condition and just need regular upkeep.
      ${isRepeatCustomer ? "This is a repeat customer who has had service with us in the past 3 months." : "This customer mentioned their vehicle is well-maintained."}
      `;
    } else if (needsDeeperCleaning) {
      maintenanceDetailInstructions = `
      This customer likely needs a deeper cleaning service rather than the Maintenance Detail Program.
      If they ask about maintenance detailing, explain that it's best for vehicles that are already very clean,
      and recommend our Full Detail or Interior Detail service instead for vehicles with stains or heavy soil.
      `;
    } else {
      maintenanceDetailInstructions = `
      DO NOT suggest the Maintenance Detail Program to this customer unless they specifically ask about it.
      It should only be offered to customers who mention they keep their car regularly maintained/detailed/garage kept,
      or repeat customers who have had service within the past 3 months.
      `;
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are the AI assistant for Clean Machine Auto Detail. Answer questions based on the provided knowledge base. 
          ${knowledgeBase}
          
          Rules:
          1. Keep responses concise, friendly, and professional
          2. If you don't know something, say so rather than making up information
          3. The customer is ${phoneNumber ? `contacting you via ${platform === "sms" ? "SMS" : "web chat"}` : "a new customer"}
          4. Always respond with grammatically correct full sentences and proper punctuation
          5. Do not refer to yourself by name or as Jody
          6. Represent Clean Machine Auto Detail in a professional manner
          
          ${maintenanceDetailInstructions}`
        },
        { role: "user", content: userMessage }
      ],
      max_tokens: 500,
    });

    // If needed, append specific maintenance detail recommendation
    let response = completion.choices[0].message.content;
    
    // Only append if we should offer maintenance detail but it wasn't included in the AI response
    if (offerMaintenanceDetail && !needsDeeperCleaning && 
        !response.toLowerCase().includes("maintenance detail") && 
        !response.toLowerCase().includes("regular upkeep")) {
      const recommendation = getMaintenanceDetailRecommendation(isRepeatCustomer);
      response += "\n\n" + recommendation;
    }

    return response;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.";
  }
}

/**
 * Analyze sentiment of a customer message
 */
export async function analyzeSentiment(text: string): Promise<{
  rating: number,
  confidence: number
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a sentiment analysis expert. Analyze the sentiment of the text and provide a rating from 1 to 5 stars and a confidence score between 0 and 1. Respond with JSON in this format: { 'rating': number, 'confidence': number }",
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      rating: Math.max(1, Math.min(5, Math.round(result.rating))),
      confidence: Math.max(0, Math.min(1, result.confidence)),
    };
  } catch (error) {
    console.error("Failed to analyze sentiment:", error);
    return {
      rating: 3,
      confidence: 0.5
    };
  }
}

/**
 * Detect service requests in customer messages
 */
export async function detectServiceRequest(text: string): Promise<{
  isServiceRequest: boolean;
  requestedService?: string;
  confidence: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an auto detailing service request analyzer. Determine if the text contains a request for a service.
          Services include: Full Detail, Interior Only, Exterior Only, Express Wash, Engine Detail, Headlight Restoration, Paint Correction, Ceramic Coating
          
          If it is a service request, identify which service they're requesting.
          Respond with JSON in this format: 
          { 
            "isServiceRequest": boolean, 
            "requestedService": string or null,
            "confidence": number between 0 and 1
          }`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Failed to detect service request:", error);
    return {
      isServiceRequest: false,
      confidence: 0
    };
  }
}

/**
 * Extract vehicle information from customer messages
 */
export async function extractVehicleInfo(text: string): Promise<{
  hasVehicleInfo: boolean;
  make?: string;
  model?: string;
  year?: string;
  color?: string;
  confidence: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a vehicle information extractor. Extract any vehicle details from the text.
          
          Respond with JSON in this format: 
          { 
            "hasVehicleInfo": boolean, 
            "make": string or null,
            "model": string or null,
            "year": string or null,
            "color": string or null,
            "confidence": number between 0 and 1
          }`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Failed to extract vehicle info:", error);
    return {
      hasVehicleInfo: false,
      confidence: 0
    };
  }
}