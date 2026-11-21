export type EmailTriggerEvent = {
  key: string;
  label: string;
  audience: string;
  /** Required events always send and cannot be switched off. */
  required: boolean;
  /** services/templates names this switch controls. Required events list none. */
  templates: readonly string[];
};

/**
 * Events an admin can see on the Triggers tab. Events whose emails are not
 * built yet (bounties, partner credits) are listed so the switch is ready when
 * their template lands: add the template name to `templates` then.
 */
export const emailTriggerEvents = [
  {
    key: "donation",
    label: "Donation received or sent",
    audience: "Donor and campaign owner",
    required: true,
    templates: [],
  },
  {
    key: "kyc",
    label: "KYC approved, rejected or resubmission requested",
    audience: "User",
    required: true,
    templates: [],
  },
  {
    key: "account",
    label: "Account suspended, restored or closed",
    audience: "User",
    required: true,
    templates: [],
  },
  {
    key: "proof_posted",
    label: "Proof of delivery posted",
    audience: "All donors to the campaign",
    required: false,
    templates: ["proof-update-published"],
  },
  {
    key: "proof_due",
    label: "Proof of delivery due in 5 days / overdue",
    audience: "Campaign owner",
    required: false,
    templates: [
      "proof-update-required",
      "proof-update-reminder",
      "proof-cause-paused",
    ],
  },
  {
    key: "bounty",
    label: "Bounty approved, changes requested or rejected",
    audience: "Campaign owner",
    required: false,
    templates: [],
  },
  {
    key: "partner_credits",
    label: "Partner credits issued, low (20%) or expiring",
    audience: "Partner admins",
    required: false,
    templates: [],
  },
  {
    key: "mint_burn",
    label: "Mint or burn requested",
    audience: "Second approver (admin)",
    required: true,
    templates: [],
  },
] as const satisfies readonly EmailTriggerEvent[];
