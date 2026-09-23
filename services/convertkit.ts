"use server";



interface ConvertKitSubscriberData {
  email: string;
  first_name?: string;
  tags?: number[];
  fields?: Record<string, string>;
}

interface ConvertKitResponse {
  success: boolean;
  subscriberId?: number;
  error?: string;
}


export async function subscribeToConvertKit({
  email,
  first_name,
  tags,
  fields,
}: ConvertKitSubscriberData): Promise<ConvertKitResponse> {
  try {
    const apiKey = process.env.CONVERTKIT_API_KEY;
    const formId = process.env.CONVERTKIT_FORM_ID;

    
    if (!apiKey) {
      console.error("ConvertKit API key not configured");
      return {
        success: false,
        error: "ConvertKit API key not configured",
      };
    }

    if (!formId) {
      console.error("ConvertKit form ID not configured");
      return {
        success: false,
        error: "ConvertKit form ID not configured",
      };
    }

    
    const url = `https://api.convertkit.com/v3/forms/${formId}/subscribe`;

    const requestBody = {
      api_key: apiKey,
      email,
      ...(first_name && { first_name }),
      ...(tags && tags.length > 0 && { tags }),
      ...(fields && Object.keys(fields).length > 0 && { fields }),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("ConvertKit API error:", data);
      return {
        success: false,
        error: data.message || "Failed to subscribe to email list",
      };
    }

    return {
      success: true,
      subscriberId: data.subscription?.subscriber?.id,
    };
  } catch (error) {
    console.error("Error subscribing to ConvertKit:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Add tags to an existing subscriber
 * @param email - Subscriber's email address
 * @param tagIds - Array of tag IDs to add
 */
export async function addTagsToSubscriber(
  email: string,
  tagIds: number[]
): Promise<ConvertKitResponse> {
  try {
    const apiKey = process.env.CONVERTKIT_API_KEY;

    if (!apiKey) {
      console.error("ConvertKit API key not configured");
      return {
        success: false,
        error: "ConvertKit API key not configured",
      };
    }

    const url = `https:

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        email,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("ConvertKit tag API error:", data);
      return {
        success: false,
        error: data.message || "Failed to add tags",
      };
    }

    return {
      success: true,
      subscriberId: data.subscription?.subscriber?.id,
    };
  } catch (error) {
    console.error("Error adding tags to ConvertKit subscriber:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}


export async function updateSubscriberFields(
  email: string,
  fields: Record<string, string>
): Promise<ConvertKitResponse> {
  try {
    const apiSecret = process.env.CONVERTKIT_API_SECRET;

    if (!apiSecret) {
      console.error("ConvertKit API secret not configured");
      return {
        success: false,
        error: "ConvertKit API secret not configured",
      };
    }

    const url = `https://api.convertkit.com/v3/subscribers`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_secret: apiSecret,
        email,
        fields,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("ConvertKit update fields error:", data);
      return {
        success: false,
        error: data.message || "Failed to update subscriber fields",
      };
    }

    return {
      success: true,
      subscriberId: data.subscriber?.id,
    };
  } catch (error) {
    console.error("Error updating ConvertKit subscriber fields:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
