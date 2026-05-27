export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface EndpointDefinition {
  id: string;
  method: HttpMethod;
  path: string;
  group: string;
  summary: string;
  description?: string;
  authRequired: boolean;
  requestBody?: SchemaField[];
  queryParams?: SchemaField[];
  responseSchema?: SchemaField[];
  exampleRequest?: any;
  exampleResponse?: any;
}

export const API_ENDPOINTS: EndpointDefinition[] = [
  // ═══════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════
  {
    id: "auth-login",
    group: "Authentication",
    method: "POST",
    path: "/auth/login",
    summary: "Login with email and password",
    description: "Authenticates a user using their email and password credentials. On success, returns a JWT access token and a refresh token. Store the access token securely (e.g. in device keychain) and pass it in the Authorization header for all authenticated requests. The refresh token should be stored separately and used to obtain a new access token when the current one expires.",
    authRequired: false,
    requestBody: [
      { name: "email", type: "string", required: true, description: "The user's registered email address" },
      { name: "password", type: "string", required: true, description: "The user's password (min 8 characters)" }
    ],
    exampleResponse: {
      success: true,
      data: {
        accessToken: "eyJhbGciOiJIUzI1NiIs...",
        refreshToken: "eyJhbGciOiJIUzI1NiIs...",
        user: { id: "uuid", email: "user@example.com", fullName: "John Doe" }
      }
    }
  },
  {
    id: "auth-register",
    group: "Authentication",
    method: "POST",
    path: "/auth/register",
    summary: "Register a new account",
    description: "Creates a new user account. An OTP verification code is sent to the provided email. The user must verify their email before they can fully use the platform. After registration, redirect the user to the OTP verification screen. The referralCode field is optional and should be provided if the user was invited by another user.",
    authRequired: false,
    requestBody: [
      { name: "email", type: "string", required: true, description: "A valid, unique email address" },
      { name: "password", type: "string", required: true, description: "Password (min 8 chars, must include uppercase, number)" },
      { name: "fullName", type: "string", required: true, description: "User's full name as displayed on their profile" },
      { name: "referralCode", type: "string", required: false, description: "Optional referral code from an existing user" }
    ],
    exampleResponse: {
      success: true,
      data: { message: "Registration successful. Please verify your email." }
    }
  },
  {
    id: "auth-google",
    group: "Authentication",
    method: "POST",
    path: "/auth/google",
    summary: "Login or register with Google",
    description: "Authenticates or registers using a Google ID Token obtained from the native Google Sign-In SDK (iOS/Android). If the user doesn't exist yet, a new account is automatically created. Returns JWT tokens just like the email login flow. Make sure to use the native Google Sign-In library for your platform (e.g. google_sign_in for Flutter, @react-native-google-signin for RN).",
    authRequired: false,
    requestBody: [
      { name: "idToken", type: "string", required: true, description: "The Google ID Token from the native Sign-In SDK" }
    ],
    exampleResponse: {
      success: true,
      data: {
        accessToken: "eyJhbGciOiJIUzI1NiIs...",
        refreshToken: "eyJhbGciOiJIUzI1NiIs...",
        user: { id: "uuid", email: "user@gmail.com", fullName: "Google User" }
      }
    }
  },
  {
    id: "auth-refresh",
    group: "Authentication",
    method: "POST",
    path: "/auth/refresh",
    summary: "Refresh access token",
    description: "Exchanges a valid refresh token for a new access token. Call this when you receive a 401 Unauthorized response from any authenticated endpoint. If the refresh token is also expired, redirect the user to the login screen. Send the refresh token in the Authorization header as a Bearer token.",
    authRequired: true,
    exampleResponse: {
      success: true,
      data: { accessToken: "eyJhbGciOiJIUzI1NiIs..." }
    }
  },
  {
    id: "auth-forgot",
    group: "Authentication",
    method: "POST",
    path: "/auth/forgot-password",
    summary: "Request password reset",
    description: "Sends a password reset link to the user's email address. The link contains a token that can be used with the /auth/reset-password endpoint. For the mobile app, you can deep-link back to a reset password screen. Always returns success even if the email doesn't exist (to prevent email enumeration).",
    authRequired: false,
    requestBody: [
      { name: "email", type: "string", required: true, description: "The email address associated with the account" }
    ],
    exampleResponse: {
      success: true,
      data: { message: "If an account exists, a reset link has been sent." }
    }
  },
  {
    id: "auth-reset",
    group: "Authentication",
    method: "POST",
    path: "/auth/reset-password",
    summary: "Reset password with token",
    description: "Resets the user's password using a token received via email. The token is a one-time-use token that expires after a set period. After successful reset, the user should be redirected to the login screen to sign in with their new password.",
    authRequired: false,
    requestBody: [
      { name: "token", type: "string", required: true, description: "The password reset token from the email link" },
      { name: "password", type: "string", required: true, description: "The new password (same strength requirements as registration)" }
    ],
    exampleResponse: {
      success: true,
      data: { message: "Password reset successfully." }
    }
  },

  // ═══════════════════════════════════════════════════
  // PROFILE & ONBOARDING
  // ═══════════════════════════════════════════════════
  {
    id: "profile-get",
    group: "Profile",
    method: "GET",
    path: "/profile",
    summary: "Get current user profile",
    description: "Returns the full profile of the currently authenticated user. This includes personal info, social links, account type, verification status, and referral code. Use this on the profile screen and to check whether the user has completed onboarding.",
    authRequired: true,
    exampleResponse: {
      success: true,
      data: {
        id: "uuid",
        fullName: "John Doe",
        username: "johndoe",
        email: "john@example.com",
        bio: "Passionate about social causes",
        profilePhoto: "profiles/uuid/photo.jpg",
        accountType: "individual",
        isVerified: false,
        onboarding_completed: true,
        referralCode: "REF123"
      }
    }
  },
  {
    id: "profile-update",
    group: "Profile",
    method: "PUT",
    path: "/profile",
    summary: "Update profile",
    description: "Updates the authenticated user's profile fields. All fields are optional — only send the fields you want to update. This endpoint is used for editing the profile screen (name, bio, social links, etc.). For profile photo updates, use the dedicated /profile/photo endpoint instead.",
    authRequired: true,
    requestBody: [
      { name: "fullName", type: "string", required: false, description: "Updated full name" },
      { name: "username", type: "string", required: false, description: "Updated username (must be unique, check with /profile/username-check first)" },
      { name: "bio", type: "string", required: false, description: "Short biography / about text" },
      { name: "phone", type: "string", required: false, description: "Phone number" },
      { name: "location", type: "string", required: false, description: "User location (city, country)" },
      { name: "twitter_url", type: "string", required: false, description: "Twitter/X profile URL" },
      { name: "facebook_url", type: "string", required: false, description: "Facebook profile URL" },
      { name: "instagram_url", type: "string", required: false, description: "Instagram profile URL" },
      { name: "linkedin_url", type: "string", required: false, description: "LinkedIn profile URL" },
      { name: "website", type: "string", required: false, description: "Personal website URL" }
    ]
  },
  {
    id: "profile-photo",
    group: "Profile",
    method: "PUT",
    path: "/profile/photo",
    summary: "Update profile photo",
    description: "Updates the user's profile photo. First upload the image using the /upload/presign endpoint (with entityType='profiles'), then pass the returned S3 key here. The old photo is not automatically deleted — it will be overwritten if the same key is used.",
    authRequired: true,
    requestBody: [
      { name: "s3Key", type: "string", required: true, description: "The S3 key returned from the presigned upload endpoint (e.g. 'profiles/uuid/photo.jpg')" }
    ],
    exampleResponse: {
      success: true,
      data: { message: "Profile photo updated successfully", profile_photo: "profiles/uuid/photo.jpg" }
    }
  },
  {
    id: "profile-username-check",
    group: "Profile",
    method: "GET",
    path: "/profile/username-check",
    summary: "Check username availability",
    description: "Checks whether a username is available before the user tries to save their profile. Call this on-the-fly (debounced) as the user types in the username field. Returns a boolean indicating availability.",
    authRequired: true,
    queryParams: [
      { name: "username", type: "string", required: true, description: "The desired username to check" }
    ],
    exampleResponse: {
      success: true,
      data: { available: true }
    }
  },
  {
    id: "profile-by-username",
    group: "Profile",
    method: "GET",
    path: "/profile/{username}",
    summary: "Get public profile by username",
    description: "Fetches the public profile of any user by their username. Use this for viewing other users' profiles (e.g. when tapping on a cause creator's name). Returns a subset of the full profile — only publicly visible fields.",
    authRequired: false,
    exampleResponse: {
      success: true,
      data: {
        fullName: "Jane Smith",
        username: "janesmith",
        bio: "Changemaker",
        profilePhoto: "profiles/uuid/photo.jpg",
        accountType: "individual"
      }
    }
  },
  {
    id: "profile-bank",
    group: "Profile",
    method: "GET",
    path: "/profile/bank",
    summary: "Get user bank details",
    description: "Returns the authenticated user's saved bank account details (bank name, account number, account name). Used on the settings or withdrawal screen. Returns null values if no bank details have been saved yet.",
    authRequired: true,
    exampleResponse: {
      success: true,
      data: {
        bankName: "First Bank",
        accountNumber: "1234567890",
        accountName: "John Doe"
      }
    }
  },
  {
    id: "onboarding-status",
    group: "Profile",
    method: "GET",
    path: "/onboarding",
    summary: "Get onboarding status",
    description: "Checks whether the user has completed the onboarding flow. Use this on app startup (after login) to decide whether to show the onboarding screens or go directly to the main app. Returns the current onboarding state and which steps are complete.",
    authRequired: true,
    exampleResponse: {
      success: true,
      data: { onboarding_completed: false, accountType: null, gender: null }
    }
  },
  {
    id: "onboarding-step",
    group: "Profile",
    method: "POST",
    path: "/onboarding/step",
    summary: "Save onboarding step progress",
    description: "Saves the user's progress for a specific onboarding step. Step 1 saves the account type (individual, organization, developer). Step 2 saves the gender. Call this as the user completes each step of the onboarding flow. After all steps are saved, the onboarding_completed flag is set to true.",
    authRequired: true,
    requestBody: [
      { name: "step", type: "number", required: true, description: "Step number (1 or 2)" },
      { name: "data", type: "object", required: true, description: "Step data — Step 1: { accountType: string }, Step 2: { gender: string }" }
    ],
    exampleRequest: {
      step: 1,
      data: { accountType: "individual" }
    },
    exampleResponse: {
      success: true,
      data: { message: "Step 1 saved successfully" }
    }
  },

  // ═══════════════════════════════════════════════════
  // CAUSES
  // ═══════════════════════════════════════════════════
  {
    id: "causes-list",
    group: "Causes",
    method: "GET",
    path: "/causes",
    summary: "List causes (paginated)",
    description: "Returns a paginated list of all published causes on the platform. This is the primary feed endpoint for the home/explore screen. Supports pagination via limit and offset query parameters. Causes are returned in reverse chronological order (newest first). Each cause includes its title, description, goal, amount raised, category, cover image, and creator info.",
    authRequired: false,
    queryParams: [
      { name: "limit", type: "number", required: false, description: "Number of causes to return per page (default: 10, max: 50)" },
      { name: "offset", type: "number", required: false, description: "Number of items to skip for pagination (default: 0)" }
    ],
    exampleResponse: {
      success: true,
      data: [
        {
          id: "uuid",
          title: "Clean Water for Rural Communities",
          category: "Environment",
          goal: 50000,
          amountRaised: 12500,
          image: "causes/uuid/cover.jpg",
          creator: { fullName: "Jane Smith", username: "janesmith" }
        }
      ],
      pagination: { total: 125, limit: 10, offset: 0, hasMore: true }
    }
  },
  {
    id: "causes-create",
    group: "Causes",
    method: "POST",
    path: "/causes",
    summary: "Create a new cause",
    description: "Creates a new fundraising cause. The cover image should be uploaded first using the /upload/presign endpoint with entityType='causes', then pass the returned S3 key as coverImageS3Key. The cause will be published immediately. The authenticated user becomes the cause owner and can view analytics for it.",
    authRequired: true,
    requestBody: [
      { name: "title", type: "string", required: true, description: "Title of the cause (max 100 characters)" },
      { name: "description", type: "string", required: true, description: "Detailed description of the cause (supports markdown)" },
      { name: "category", type: "string", required: true, description: "Category (e.g. 'Education', 'Health', 'Environment')" },
      { name: "goal", type: "number", required: true, description: "Funding goal amount in NGN" },
      { name: "coverImageS3Key", type: "string", required: false, description: "S3 key from the presigned upload for the cover image" }
    ]
  },
  {
    id: "causes-details",
    group: "Causes",
    method: "GET",
    path: "/causes/{id}",
    summary: "Get cause details",
    description: "Returns the full details of a specific cause by its ID. This includes the title, description, category, funding goal, amount raised, donor count, cover image, creator info, creation date, and more. Use this on the cause detail screen when a user taps on a cause from the feed.",
    authRequired: false,
    exampleResponse: {
      success: true,
      data: {
        id: "uuid",
        title: "Clean Water for Rural Communities",
        description: "Full markdown description...",
        category: "Environment",
        goal: 50000,
        amountRaised: 12500,
        donorCount: 45,
        image: "causes/uuid/cover.jpg",
        creator: { id: "uuid", fullName: "Jane Smith", username: "janesmith", profilePhoto: "profiles/uuid/photo.jpg" }
      }
    }
  },
  {
    id: "causes-count",
    group: "Causes",
    method: "GET",
    path: "/causes/count",
    summary: "Get total causes count",
    description: "Returns the total number of causes on the platform. Useful for displaying stats on the home screen or for calculating pagination. Can be filtered by category or search term.",
    authRequired: false,
    exampleResponse: { success: true, data: { count: 125 } }
  },
  {
    id: "causes-user",
    group: "Causes",
    method: "GET",
    path: "/causes/user",
    summary: "Get authenticated user's causes",
    description: "Returns all causes created by the currently authenticated user. Can be filtered by status (e.g. 'active', 'completed', 'all'). Use this on the 'My Causes' screen in the user's profile or dashboard section.",
    authRequired: true,
    queryParams: [
      { name: "status", type: "string", required: false, description: "Filter by status: 'active', 'completed', or 'all' (default: 'all')" }
    ]
  },
  {
    id: "causes-follow",
    group: "Causes",
    method: "POST",
    path: "/causes/{id}/follow",
    summary: "Follow or unfollow a cause",
    description: "Toggles the follow state for a cause. If the user is not following the cause, they will start following it. If they are already following, they will unfollow. Following a cause allows the user to receive updates and notifications about the cause. No request body is needed — the toggle is automatic.",
    authRequired: true,
    exampleResponse: {
      success: true,
      data: { following: true, message: "Cause followed successfully" }
    }
  },
  {
    id: "causes-share",
    group: "Causes",
    method: "POST",
    path: "/causes/{id}/share",
    summary: "Record a cause share event",
    description: "Records that a user shared this cause (e.g. via social media, messaging apps, etc.). This increments the share count for the cause and may trigger EIZA reward points for the sharer. Call this after the native share dialog completes successfully.",
    authRequired: false
  },

  // ═══════════════════════════════════════════════════
  // PETITIONS
  // ═══════════════════════════════════════════════════
  {
    id: "petitions-list",
    group: "Petitions",
    method: "GET",
    path: "/petitions",
    summary: "List petitions (paginated)",
    description: "Returns a paginated list of all petitions on the platform, sorted by newest first. Each petition includes its title, description, target signatures, current signature count, cover image, and creator info. Use this on the petitions tab of the explore screen.",
    authRequired: false,
    queryParams: [
      { name: "limit", type: "number", required: false, description: "Items per page (default: 10)" },
      { name: "offset", type: "number", required: false, description: "Items to skip (default: 0)" },
      { name: "category", type: "string", required: false, description: "Filter by category" },
      { name: "search", type: "string", required: false, description: "Search petitions by title" }
    ]
  },
  {
    id: "petitions-create",
    group: "Petitions",
    method: "POST",
    path: "/petitions",
    summary: "Create a new petition",
    description: "Creates a new petition campaign. Similar to causes, upload a cover image first using /upload/presign with entityType='petitions', then pass the S3 key. The petition is published immediately and the authenticated user becomes the petition owner.",
    authRequired: true,
    requestBody: [
      { name: "title", type: "string", required: true, description: "Petition title (max 100 characters)" },
      { name: "description", type: "string", required: true, description: "Detailed petition description" },
      { name: "targetSignatures", type: "number", required: true, description: "Goal number of signatures" },
      { name: "category", type: "string", required: false, description: "Petition category" },
      { name: "coverImageS3Key", type: "string", required: false, description: "S3 key for cover image from presigned upload" }
    ]
  },
  {
    id: "petitions-details",
    group: "Petitions",
    method: "GET",
    path: "/petitions/{id}",
    summary: "Get petition details",
    description: "Returns the full details of a specific petition including title, description, target/current signatures, cover image, creator info, and recent signatories. Use this on the petition detail screen.",
    authRequired: false
  },
  {
    id: "petitions-count",
    group: "Petitions",
    method: "GET",
    path: "/petitions/count",
    summary: "Get total petitions count",
    description: "Returns the total number of petitions on the platform. Can be filtered by category or search term. Useful for pagination calculations and displaying stats.",
    authRequired: false,
    queryParams: [
      { name: "category", type: "string", required: false, description: "Filter by category" },
      { name: "search", type: "string", required: false, description: "Search by title" }
    ],
    exampleResponse: { success: true, data: { count: 42 } }
  },
  {
    id: "petitions-user",
    group: "Petitions",
    method: "GET",
    path: "/petitions/user",
    summary: "Get authenticated user's petitions",
    description: "Returns all petitions created by the currently authenticated user. Includes creator profile info for each petition. Use this on the 'My Petitions' screen in the dashboard.",
    authRequired: true
  },
  {
    id: "petitions-share",
    group: "Petitions",
    method: "POST",
    path: "/petitions/{id}/share",
    summary: "Record a petition share event",
    description: "Records that a user shared this petition. Increments the share count and may trigger EIZA reward points. Call this after the native share dialog completes.",
    authRequired: false
  },

  // ═══════════════════════════════════════════════════
  // DONATIONS & SIGNATURES
  // ═══════════════════════════════════════════════════
  {
    id: "donations-create",
    group: "Donations & Signatures",
    method: "POST",
    path: "/donations",
    summary: "Create a donation record",
    description: "Records a donation to a cause after payment has been verified. Typically, the flow is: (1) Initialize payment via /payments/initialize, (2) User completes payment in the Paystack webview, (3) Verify payment via /payments/verify, (4) Create the donation record using this endpoint. The donation is linked to the cause and the donor's email.",
    authRequired: false,
    requestBody: [
      { name: "causeId", type: "string", required: true, description: "The ID of the cause being donated to" },
      { name: "amount", type: "number", required: true, description: "Donation amount in NGN" },
      { name: "email", type: "string", required: true, description: "Donor's email address" },
      { name: "isAnonymous", type: "boolean", required: false, description: "Whether the donation should be anonymous (default: false)" },
      { name: "message", type: "string", required: false, description: "Optional message from the donor" }
    ]
  },
  {
    id: "donations-cause",
    group: "Donations & Signatures",
    method: "GET",
    path: "/donations/cause/{id}",
    summary: "List donations for a cause",
    description: "Returns a paginated list of donations for a specific cause. Includes donor name, amount, date, and optional message. Anonymous donations show 'Anonymous' as the donor name. Use this on the cause detail screen to show recent donors.",
    authRequired: false,
    queryParams: [
      { name: "limit", type: "number", required: false, description: "Items per page (default: 10)" },
      { name: "offset", type: "number", required: false, description: "Items to skip (default: 0)" }
    ]
  },
  {
    id: "donations-user",
    group: "Donations & Signatures",
    method: "GET",
    path: "/donations/user",
    summary: "Get authenticated user's donations",
    description: "Returns a paginated list of all donations made by the currently authenticated user, across all causes. Includes cause title and cover image for each donation. Use this on the 'My Donations' screen in the user dashboard.",
    authRequired: true,
    queryParams: [
      { name: "limit", type: "number", required: false, description: "Items per page (default: 10)" },
      { name: "offset", type: "number", required: false, description: "Items to skip (default: 0)" }
    ]
  },
  {
    id: "signatures-create",
    group: "Donations & Signatures",
    method: "POST",
    path: "/signatures",
    summary: "Sign a petition",
    description: "Adds the user's signature to a petition. The email is used to prevent duplicate signatures on the same petition. Optional name and message fields allow the signer to leave a public comment. Anonymous signatures are also supported.",
    authRequired: false,
    requestBody: [
      { name: "petitionId", type: "string", required: true, description: "The ID of the petition to sign" },
      { name: "email", type: "string", required: true, description: "Signer's email address (used for dedup)" },
      { name: "name", type: "string", required: false, description: "Signer's display name" },
      { name: "message", type: "string", required: false, description: "Optional message / reason for signing" },
      { name: "isAnonymous", type: "boolean", required: false, description: "Whether signature should be anonymous" }
    ]
  },
  {
    id: "signatures-check",
    group: "Donations & Signatures",
    method: "GET",
    path: "/signatures/check",
    summary: "Check if user has signed a petition",
    description: "Checks whether a specific email has already signed a given petition. Use this to show 'Already Signed' state on the petition detail screen and disable the sign button. Returns a boolean.",
    authRequired: false,
    queryParams: [
      { name: "petitionId", type: "string", required: true, description: "The petition ID to check" },
      { name: "email", type: "string", required: true, description: "The email address to check" }
    ],
    exampleResponse: { success: true, data: { signed: true } }
  },
  {
    id: "signatures-petition",
    group: "Donations & Signatures",
    method: "GET",
    path: "/signatures/petition/{id}",
    summary: "List signatures for a petition",
    description: "Returns a paginated list of all signatures for a specific petition. Includes signer name, message, date, and anonymous flag. Use this on the petition detail screen to show recent signatories.",
    authRequired: false,
    queryParams: [
      { name: "limit", type: "number", required: false, description: "Items per page (default: 10)" },
      { name: "offset", type: "number", required: false, description: "Items to skip (default: 0)" }
    ]
  },
  {
    id: "signatures-user",
    group: "Donations & Signatures",
    method: "GET",
    path: "/signatures/user",
    summary: "Get authenticated user's signatures",
    description: "Returns a paginated list of all petitions the authenticated user has signed. Includes petition title and cover image. Use this on the 'My Signatures' or activity history screen.",
    authRequired: true,
    queryParams: [
      { name: "limit", type: "number", required: false, description: "Items per page (default: 10)" },
      { name: "offset", type: "number", required: false, description: "Items to skip (default: 0)" }
    ]
  },
  {
    id: "pledges-create",
    group: "Donations & Signatures",
    method: "POST",
    path: "/pledges",
    summary: "Create a donation pledge",
    description: "Creates a pledge to donate to a cause at a future date. The user will receive a reminder at the specified date. Pledges are not actual payments — they are commitments that help cause creators estimate future support. The causeTitle is stored for display in the reminder email.",
    authRequired: false,
    requestBody: [
      { name: "causeId", type: "string", required: true, description: "The cause to pledge to" },
      { name: "amount", type: "number", required: true, description: "Pledged amount in NGN" },
      { name: "reminderDate", type: "string", required: true, description: "ISO date string for when to send the reminder" },
      { name: "name", type: "string", required: true, description: "Pledger's name" },
      { name: "email", type: "string", required: true, description: "Pledger's email for the reminder" },
      { name: "note", type: "string", required: false, description: "Optional note / reason for pledging" },
      { name: "causeTitle", type: "string", required: false, description: "Cause title (for reminder email)" }
    ]
  },

  // ═══════════════════════════════════════════════════
  // COMMENTS
  // ═══════════════════════════════════════════════════
  {
    id: "comments-list",
    group: "Comments",
    method: "GET",
    path: "/comments/cause/{id}",
    summary: "List comments for a cause",
    description: "Returns a paginated list of top-level comments for a specific cause, sorted by newest first. Each comment includes the author's name, profile photo, comment text, and reply count. Use this on the cause detail screen's comments section.",
    authRequired: false,
    queryParams: [
      { name: "limit", type: "number", required: false, description: "Items per page (default: 10)" },
      { name: "offset", type: "number", required: false, description: "Items to skip (default: 0)" }
    ]
  },
  {
    id: "comments-create",
    group: "Comments",
    method: "POST",
    path: "/comments/cause/{id}",
    summary: "Add a comment to a cause",
    description: "Posts a new comment on a cause. Requires authentication so the comment is linked to the user's profile. To reply to an existing comment, include the parentId field with the ID of the comment being replied to. This also triggers EIZA reward points for commenting.",
    authRequired: true,
    requestBody: [
      { name: "content", type: "string", required: true, description: "The comment text (max 1000 characters)" },
      { name: "parentId", type: "string", required: false, description: "Parent comment ID if this is a reply" }
    ]
  },
  {
    id: "comments-update",
    group: "Comments",
    method: "PUT",
    path: "/comments/{id}",
    summary: "Update a comment",
    description: "Edits an existing comment. Only the comment author can update their own comment. Returns 403 if another user tries to edit it. The comment's updated_at timestamp is refreshed.",
    authRequired: true,
    requestBody: [
      { name: "content", type: "string", required: true, description: "Updated comment text" }
    ]
  },
  {
    id: "comments-delete",
    group: "Comments",
    method: "DELETE",
    path: "/comments/{id}",
    summary: "Delete a comment",
    description: "Permanently deletes a comment. Only the comment author can delete their own comment. Returns 403 if another user tries to delete it. Replies to the deleted comment may also be removed or orphaned depending on the implementation.",
    authRequired: true
  },
  {
    id: "comments-replies",
    group: "Comments",
    method: "GET",
    path: "/comments/{id}/replies",
    summary: "Get replies for a comment",
    description: "Returns all replies to a specific comment. Use this when the user taps 'View Replies' on a comment in the cause detail screen. Replies include the same info as top-level comments (author, text, date).",
    authRequired: false
  },

  // ═══════════════════════════════════════════════════
  // DASHBOARD & ANALYTICS
  // ═══════════════════════════════════════════════════
  {
    id: "dashboard-stats",
    group: "Dashboard",
    method: "GET",
    path: "/dashboard/stats",
    summary: "Get user global stats",
    description: "Returns aggregated statistics for the authenticated user's dashboard: total causes created, total amount raised across all causes, total donations received, total petition signatures collected, etc. Use this for the main dashboard overview cards.",
    authRequired: true,
    exampleResponse: {
      success: true,
      data: {
        totalCauses: 5,
        totalRaised: 125000,
        totalDonations: 89,
        totalPetitions: 3,
        totalSignatures: 456
      }
    }
  },
  {
    id: "dashboard-trends",
    group: "Dashboard",
    method: "GET",
    path: "/dashboard/trends",
    summary: "Get user donation trends",
    description: "Returns time-series data for the user's donation history — useful for charts and graphs on the dashboard. Shows daily/weekly/monthly donation amounts over a period. Use this to render a line chart or bar chart on the analytics screen.",
    authRequired: true
  },
  {
    id: "dashboard-causes",
    group: "Dashboard",
    method: "GET",
    path: "/dashboard/causes",
    summary: "Get user's causes with stats",
    description: "Returns the authenticated user's causes enriched with performance stats (amount raised, donor count, follower count). Use this on the dashboard 'My Causes' tab where you need to show each cause with its metrics rather than just the basic cause data.",
    authRequired: true
  },
  {
    id: "dashboard-petitions",
    group: "Dashboard",
    method: "GET",
    path: "/dashboard/petitions",
    summary: "Get user's petitions with stats",
    description: "Returns the authenticated user's petitions enriched with performance stats (signature count, share count). Similar to dashboard/causes but for petition campaigns.",
    authRequired: true
  },
  {
    id: "dashboard-analytics-cause",
    group: "Dashboard",
    method: "GET",
    path: "/dashboard/analytics/cause/{id}",
    summary: "Get cause analytics",
    description: "Returns detailed analytics for a specific cause — donation trends, top donors, geographic breakdown, referral sources, etc. Only the cause owner should access this. Use this on the individual cause analytics screen within the dashboard.",
    authRequired: true
  },
  {
    id: "dashboard-analytics-petition",
    group: "Dashboard",
    method: "GET",
    path: "/dashboard/analytics/petition/{id}",
    summary: "Get petition analytics",
    description: "Returns detailed analytics for a specific petition — signature growth over time, geographic breakdown of signers, referral sources, etc. Only the petition owner should access this.",
    authRequired: true
  },

  // ═══════════════════════════════════════════════════
  // WALLET & REWARDS
  // ═══════════════════════════════════════════════════
  {
    id: "wallet-get",
    group: "Wallet & Rewards",
    method: "GET",
    path: "/wallet",
    summary: "Get user wallet and transactions",
    description: "Returns the authenticated user's EIZA wallet balance and recent reward transactions. The wallet tracks points earned through platform activities (commenting, sharing, donating, daily login, streaks). Use this on the rewards wallet screen.",
    authRequired: true,
    exampleResponse: {
      success: true,
      data: {
        wallet: { balance: 1250.5 },
        transactions: [
          { id: "uuid", transactionType: "comment", amount: 50, createdAt: "2024-01-15T10:30:00Z" },
          { id: "uuid", transactionType: "share", amount: 100, createdAt: "2024-01-15T09:00:00Z" }
        ]
      }
    }
  },
  {
    id: "wallet-stats",
    group: "Wallet & Rewards",
    method: "GET",
    path: "/wallet/stats",
    summary: "Get user streak and activity stats",
    description: "Returns the authenticated user's streak data — weekly streak count, monthly active status, last active date, etc. Use this to power the streak widget on the rewards screen. The streak resets if the user misses a day.",
    authRequired: true,
    exampleResponse: {
      success: true,
      data: {
        weeklyStreak: 5,
        isMonthlyActive: true,
        lastActiveDate: "2024-01-15T00:00:00Z"
      }
    }
  },
  {
    id: "referrals-get",
    group: "Wallet & Rewards",
    method: "GET",
    path: "/referrals",
    summary: "Get user referrals data",
    description: "Returns the authenticated user's referral statistics — total referrals sent, number of registered referees, and pending invites. Also includes the user's unique referral code that can be shared. Use this on the referral screen and to populate the invite/share flow.",
    authRequired: true,
    exampleResponse: {
      success: true,
      data: {
        referralCode: "REF123",
        totalReferrals: 10,
        registeredReferees: 7,
        pendingInvites: 3
      }
    }
  },

  // ═══════════════════════════════════════════════════
  // KYC & IDENTITY
  // ═══════════════════════════════════════════════════
  {
    id: "kyc-get",
    group: "KYC & Identity",
    method: "GET",
    path: "/kyc",
    summary: "Get KYC verification status",
    description: "Returns the current KYC verification status for the authenticated user. Possible statuses: 'pending' (submitted, under review), 'approved' (verified), 'rejected' (with rejection reason). If no KYC has been submitted, returns null. Use this to show the verification badge and prompt users to verify.",
    authRequired: true,
    exampleResponse: {
      success: true,
      data: {
        status: "pending",
        document_type: "national_id",
        document_url: "kyc/uuid/id-doc.jpg",
        verification_notes: null
      }
    }
  },
  {
    id: "kyc-submit",
    group: "KYC & Identity",
    method: "POST",
    path: "/kyc",
    summary: "Submit KYC documents",
    description: "Submits identity verification documents for KYC review. First upload the document image using /upload/presign with entityType='kyc', then pass the S3 key here. If a previous KYC submission exists, it will be updated (useful for re-submission after rejection). The status is set to 'pending' and an admin will review the submission.",
    authRequired: true,
    requestBody: [
      { name: "documentType", type: "string", required: true, description: "Type of ID document: 'national_id', 'drivers_license', 'passport', 'voters_card'" },
      { name: "documentS3Key", type: "string", required: true, description: "S3 key of the uploaded document image from /upload/presign" },
      { name: "idNumber", type: "string", required: true, description: "The document's ID number" }
    ]
  },

  // ═══════════════════════════════════════════════════
  // PAYMENTS & GEO
  // ═══════════════════════════════════════════════════
  {
    id: "payments-init",
    group: "Payments & Geo",
    method: "POST",
    path: "/payments/initialize",
    summary: "Initialize Paystack payment",
    description: "Initializes a Paystack payment transaction for a donation. Returns an authorization URL that should be opened in an in-app browser or webview for the user to complete payment. After payment, Paystack redirects back to the app. Then call /payments/verify with the reference to confirm the payment before recording the donation.",
    authRequired: false,
    requestBody: [
      { name: "amount", type: "number", required: true, description: "Amount to charge in NGN (minimum 100)" },
      { name: "email", type: "string", required: true, description: "Payer's email address" },
      { name: "causeId", type: "string", required: true, description: "The cause being donated to" }
    ],
    exampleResponse: {
      success: true,
      data: {
        authorization_url: "https://checkout.paystack.com/...",
        reference: "ref_abc123",
        access_code: "access_code_123"
      }
    }
  },
  {
    id: "payments-verify",
    group: "Payments & Geo",
    method: "GET",
    path: "/payments/verify",
    summary: "Verify Paystack payment",
    description: "Verifies a Paystack payment using the transaction reference. Call this after the user returns from the Paystack checkout page to confirm the payment was successful. Returns the payment status and amount. Only proceed to create the donation record if the status is 'success'.",
    authRequired: false,
    queryParams: [
      { name: "reference", type: "string", required: true, description: "The Paystack transaction reference from the initialization step" }
    ],
    exampleResponse: {
      success: true,
      data: { status: "success", amount: 5000, reference: "ref_abc123" }
    }
  },
  {
    id: "geo-countries",
    group: "Payments & Geo",
    method: "GET",
    path: "/geo/countries",
    summary: "List all countries",
    description: "Returns a list of all countries from the database. Used for country selection dropdowns in forms (e.g. onboarding, KYC, profile). Each country includes its name and country code.",
    authRequired: false,
    exampleResponse: {
      success: true,
      data: [
        { name: "Nigeria", code: "NG" },
        { name: "Ghana", code: "GH" }
      ]
    }
  },
  {
    id: "geo-states",
    group: "Payments & Geo",
    method: "GET",
    path: "/geo/states",
    summary: "List states for a country",
    description: "Returns all states/provinces for a given country, filtered by country code. Use this to populate a state dropdown after the user selects a country. Each state includes its name and state code.",
    authRequired: false,
    queryParams: [
      { name: "countryCode", type: "string", required: true, description: "ISO country code (e.g. 'NG' for Nigeria)" }
    ],
    exampleResponse: {
      success: true,
      data: [
        { name: "Lagos", code: "LA" },
        { name: "Abuja", code: "FC" }
      ]
    }
  },
  {
    id: "geo-cities",
    group: "Payments & Geo",
    method: "GET",
    path: "/geo/cities",
    summary: "List cities for a state",
    description: "Returns all cities for a given state within a country. Use this to populate a city dropdown after the user selects a state. Requires both country code and state code.",
    authRequired: false,
    queryParams: [
      { name: "countryCode", type: "string", required: true, description: "ISO country code (e.g. 'NG')" },
      { name: "stateCode", type: "string", required: true, description: "State code (e.g. 'LA' for Lagos)" }
    ],
    exampleResponse: {
      success: true,
      data: [{ name: "Ikeja" }, { name: "Lekki" }, { name: "Victoria Island" }]
    }
  },
  {
    id: "geo-banks",
    group: "Payments & Geo",
    method: "GET",
    path: "/geo/banks",
    summary: "List supported banks",
    description: "Returns a list of all banks supported by Paystack for withdrawals and account verification. Use this to populate a bank selection dropdown when the user is adding their bank details for receiving funds from their causes.",
    authRequired: false,
    exampleResponse: {
      success: true,
      data: [
        { name: "First Bank of Nigeria", code: "011" },
        { name: "Guaranty Trust Bank", code: "058" }
      ]
    }
  },

  // ═══════════════════════════════════════════════════
  // UPLOADS
  // ═══════════════════════════════════════════════════
  {
    id: "upload-presign",
    group: "Uploads",
    method: "POST",
    path: "/upload/presign",
    summary: "Generate presigned S3 upload URL",
    description: "Generates a presigned URL for directly uploading a file to S3 from the mobile app. The flow is: (1) Call this endpoint with the file metadata, (2) Use the returned uploadUrl to PUT the file directly to S3 with the correct Content-Type header, (3) Use the returned s3Key in subsequent API calls (e.g. creating a cause, updating profile photo, submitting KYC). Supported entity types determine the S3 folder: 'causes', 'profiles', 'petitions', 'kyc'.",
    authRequired: true,
    requestBody: [
      { name: "entityType", type: "string", required: true, description: "Upload category: 'causes', 'profiles', 'petitions', or 'kyc'" },
      { name: "fileType", type: "string", required: true, description: "MIME type of the file (e.g. 'image/jpeg', 'image/png', 'application/pdf')" },
      { name: "fileName", type: "string", required: true, description: "Original filename with extension (e.g. 'profile-photo.jpg')" }
    ],
    exampleResponse: {
      success: true,
      data: {
        uploadUrl: "https://s3.amazonaws.com/bucket/causes/uuid/unique-id.jpg?X-Amz-Algorithm=...",
        s3Key: "causes/uuid/unique-id.jpg",
        entityId: "uuid"
      }
    }
  }
];

// Helper to group endpoints
export const ENDPOINT_GROUPS = Array.from(new Set(API_ENDPOINTS.map(ep => ep.group)));
