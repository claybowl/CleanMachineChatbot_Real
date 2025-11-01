import OpenAI from "openai";
import { generatePrompt, extractKnowledgeBase } from "./knowledge";
import { shouldOfferMaintenanceDetail, getMaintenanceDetailRecommendation, mightNeedDeeperCleaning } from "./maintenanceDetail";
import { customerMemory } from "./customerMemory";
import { 
  checkCustomerDatabase, 
  validateAddress, 
  getAvailableSlots, 
  getUpsellOffers, 
  createAppointment,
  buildInvoiceSummary 
} from "./schedulingTools";
import { conversationState } from "./conversationState";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * OpenAI Function Schemas for Scheduling Tools
 * These allow the AI to intelligently schedule appointments using real data
 */
const SCHEDULING_FUNCTIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_customer_database",
      description: "Look up customer information in the database by phone number. Use this to greet returning customers by name and access their service history.",
      parameters: {
        type: "object",
        properties: {
          phone: {
            type: "string",
            description: "Customer's phone number (any format accepted)"
          }
        },
        required: ["phone"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "validate_address",
      description: "Validate a customer's address and check if it's within the service area (26-minute drive radius from Tulsa). Must be called before booking an appointment.",
      parameters: {
        type: "object",
        properties: {
          phone: {
            type: "string",
            description: "Customer's phone number"
          },
          address: {
            type: "string",
            description: "Customer's full address (street, city, state)"
          }
        },
        required: ["phone", "address"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_available_slots",
      description: "Fetch real available appointment time slots from Google Calendar for a specific service. Call this when customer wants to schedule an appointment.",
      parameters: {
        type: "object",
        properties: {
          phone: {
            type: "string",
            description: "Customer's phone number"
          },
          service: {
            type: "string",
            description: "The service they want to book (e.g., 'Full Detail', 'Interior Detail', etc.)"
          }
        },
        required: ["phone", "service"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_upsell_offers",
      description: "Get relevant add-on services (upsells) that complement the main service selected. Call after customer selects a service.",
      parameters: {
        type: "object",
        properties: {
          phone: {
            type: "string",
            description: "Customer's phone number"
          },
          service: {
            type: "string",
            description: "The main service they selected"
          }
        },
        required: ["phone", "service"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_appointment",
      description: "Book the appointment in Google Calendar once all details are confirmed by the customer. Only call this after customer explicitly confirms they want to book.",
      parameters: {
        type: "object",
        properties: {
          phone: {
            type: "string",
            description: "Customer's phone number"
          }
        },
        required: ["phone"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "build_booking_summary",
      description: "Generate a formatted invoice-style summary of the pending appointment for customer review before confirming.",
      parameters: {
        type: "object",
        properties: {
          phone: {
            type: "string",
            description: "Customer's phone number"
          }
        },
        required: ["phone"]
      }
    }
  }
];

/**
 * Execute a function call requested by OpenAI
 */
async function executeFunctionCall(
  functionName: string,
  args: any
): Promise<string> {
  try {
    console.log(`[FUNCTION CALL] Executing ${functionName} with args:`, args);
    
    switch (functionName) {
      case "check_customer_database": {
        const result = await checkCustomerDatabase(args.phone);
        return JSON.stringify(result);
      }
      
      case "validate_address": {
        const result = await validateAddress(args.phone, args.address);
        return JSON.stringify(result);
      }
      
      case "get_available_slots": {
        const result = await getAvailableSlots(args.phone, args.service);
        return JSON.stringify(result);
      }
      
      case "get_upsell_offers": {
        const result = await getUpsellOffers(args.phone, args.service);
        return JSON.stringify(result);
      }
      
      case "create_appointment": {
        const result = await createAppointment(args.phone);
        return JSON.stringify(result);
      }
      
      case "build_booking_summary": {
        const result = buildInvoiceSummary(args.phone);
        return JSON.stringify(result);
      }
      
      default:
        return JSON.stringify({ error: `Unknown function: ${functionName}` });
    }
  } catch (error) {
    console.error(`[FUNCTION CALL ERROR] ${functionName}:`, error);
    return JSON.stringify({ 
      error: `Failed to execute ${functionName}: ${(error as Error).message}` 
    });
  }
}

/**
 * Generate an AI response with function calling support for scheduling
 * Now supports both general conversation AND intelligent appointment booking
 */
export async function generateAIResponse(
  userMessage: string, 
  phoneNumber: string, 
  platform: "sms" | "web" = "web",
  behaviorSettings?: {
    tone?: string;
    forcedAction?: string;
    formality?: number;
    responseLength?: number;
    proactivity?: number;
  }
) {
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

    // Build behavior instructions from settings
    let behaviorInstructions = "";
    if (behaviorSettings) {
      if (behaviorSettings.tone) {
        behaviorInstructions += `\n- Tone: ${behaviorSettings.tone}`;
      }
      if (behaviorSettings.formality !== undefined) {
        const formalityLevel = behaviorSettings.formality;
        if (formalityLevel < 30) {
          behaviorInstructions += `\n- Be very casual and friendly`;
        } else if (formalityLevel < 70) {
          behaviorInstructions += `\n- Use a balanced, professional yet approachable tone`;
        } else {
          behaviorInstructions += `\n- Be very formal and professional`;
        }
      }
      if (behaviorSettings.responseLength !== undefined) {
        const lengthLevel = behaviorSettings.responseLength;
        if (lengthLevel < 30) {
          behaviorInstructions += `\n- Keep responses very brief and to the point`;
        } else if (lengthLevel < 70) {
          behaviorInstructions += `\n- Provide moderate-length responses`;
        } else {
          behaviorInstructions += `\n- Provide detailed, comprehensive responses`;
        }
      }
      if (behaviorSettings.proactivity !== undefined && behaviorSettings.proactivity > 60) {
        behaviorInstructions += `\n- Be proactive in offering suggestions and upsells`;
      }
      if (behaviorSettings.forcedAction === 'show_scheduler') {
        behaviorInstructions += `\n- Encourage the customer to book an appointment and direct them to the scheduling system`;
      } else if (behaviorSettings.forcedAction === 'collect_info') {
        behaviorInstructions += `\n- Focus on collecting customer information (name, vehicle info, address)`;
      }
    }

    // Get conversation state for context
    const state = conversationState.getState(phoneNumber);
    const stateContext = state ? `
    
    Current Booking State:
    - Customer Name: ${state.customerName || "Not collected"}
    - Service Selected: ${state.service || "None"}
    - Address: ${state.address || "Not provided"}
    - Selected Time: ${state.selectedTimeSlot || "Not selected"}
    - Add-ons: ${state.addOns?.join(', ') || "None"}
    - Steps Completed: ${Object.keys(state.stepsCompleted).filter(k => state.stepsCompleted[k as keyof typeof state.stepsCompleted]).join(', ')}
    
    IMPORTANT: Don't ask for information that's already collected above. Remember context across the conversation.
    ` : "";
    
    // Build conversation messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are the AI assistant for Clean Machine Auto Detail, a mobile auto detailing service in Tulsa, OK. 
        
        ${knowledgeBase}
        
        SCHEDULING CAPABILITIES:
        You have access to scheduling tools to help customers book appointments:
        - check_customer_database: Look up returning customers by phone to greet them personally
        - validate_address: Check if address is within service area (26-min radius)
        - get_available_slots: Fetch real appointment times from Google Calendar
        - get_upsell_offers: Suggest relevant add-on services
        - build_booking_summary: Show appointment summary for confirmation
        - create_appointment: Book the appointment in Google Calendar
        
        BOOKING WORKFLOW:
        When customer wants to book:
        1. Check customer database first (if you have their phone)
        2. Ask for their service preference
        3. Get their address and validate it
        4. Show available time slots
        5. Offer relevant add-ons
        6. Show booking summary for confirmation
        7. Create appointment when they confirm
        
        Use the tools naturally - don't announce you're calling functions, just use them to help customers seamlessly.
        ${stateContext}
        
        Rules:
        1. Keep responses concise, friendly, and professional
        2. If you don't know something, say so rather than making up information
        3. The customer is contacting you via ${platform === "sms" ? "SMS" : "web chat"}
        4. Always respond with grammatically correct full sentences and proper punctuation
        5. Do not refer to yourself by name or as Jody
        6. Represent Clean Machine Auto Detail in a professional manner
        7. When booking, guide customers through the process naturally without being robotic
        
        ${maintenanceDetailInstructions}
        ${behaviorInstructions ? `\nBehavior Adjustments:${behaviorInstructions}` : ''}`
      },
      { role: "user", content: userMessage }
    ];
    
    // Iterative function calling loop
    let currentMessages = [...messages];
    const MAX_ITERATIONS = 10; // Prevent infinite loops
    let iterations = 0;
    
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: currentMessages,
        tools: SCHEDULING_FUNCTIONS,
        tool_choice: "auto",
        max_tokens: 500,
      });
      
      const responseMessage = completion.choices[0].message;
      currentMessages.push(responseMessage);
      
      // If no tool calls, we have final response
      if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
        let finalResponse = responseMessage.content || "I apologize, but I didn't generate a proper response. Please try again.";
        
        // Only append maintenance detail recommendation if not in booking flow
        if (offerMaintenanceDetail && !needsDeeperCleaning && 
            !state?.service &&
            !finalResponse.toLowerCase().includes("maintenance detail") && 
            !finalResponse.toLowerCase().includes("regular upkeep")) {
          const recommendation = getMaintenanceDetailRecommendation(isRepeatCustomer);
          finalResponse += "\n\n" + recommendation;
        }
        
        return finalResponse;
      }
      
      // Execute function calls
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`[AI FUNCTION CALL] ${functionName}(${JSON.stringify(functionArgs)})`);
        
        const functionResult = await executeFunctionCall(functionName, functionArgs);
        
        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: functionResult
        });
      }
    }
    
    // If we hit max iterations, return last AI response
    console.warn("[AI] Hit maximum function call iterations");
    return "I'm working on helping you with your request. Please let me know if you need anything else!";
    
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