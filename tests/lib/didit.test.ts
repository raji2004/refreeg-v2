import {
  buildResubmitNodes,
  compareKycRecord,
  extractCachedDecisionFields,
  normalizeComparisonResult,
  parseDiditSessionId,
  summarizeDecision,
} from "@/lib/didit";

const decisionFixture = {
  status: "Approved",
  features: "id_verification,liveness,face_match,aml_screening",
  id_verifications: [
    {
      node_id: "feature_id_1",
      status: "Approved",
      document_type: "passport",
      document_number: "A04471571",
      full_name: "Zainab Bello",
      date_of_birth: "1996-06-02",
      front_image: "https://img/front",
      back_image: null,
      id_lookup: {
        source: "NIMC",
        outcome: "match",
        comparison: [
          {
            field: "Full name",
            provided: "Zainab Bello",
            record: "Zainab Bello",
            result: "exact_match",
          },
          {
            field: "Date of birth",
            provided: "02 Jun 1996",
            record: "02 Jun 1989",
            result: "mismatch",
          },
        ],
      },
      warnings: [{ risk: "low", short_description: "Photo quality is low" }],
    },
  ],
  face_matches: [{ status: "Approved", score: 94.4 }],
  liveness_checks: [
    {
      node_id: "feature_liveness_1",
      status: "Approved",
      method: "ACTIVE_3D",
      score: 89.9,
      reference_image: "https://img/selfie",
      matches: [],
    },
  ],
  aml_screenings: [{ status: "clear", total_hits: 0 }],
};

describe("parseDiditSessionId", () => {
  it("splits the composite document_url format", () => {
    expect(parseDiditSessionId("abc:::https://verify.example")).toBe("abc");
  });

  it("accepts a bare session uuid", () => {
    expect(parseDiditSessionId("6f1c9e5e-1c2a-4b1e-9e2a-3f4b5c6d7e8f")).toBe(
      "6f1c9e5e-1c2a-4b1e-9e2a-3f4b5c6d7e8f",
    );
  });

  it("returns null for legacy S3 keys and test doubles", () => {
    expect(parseDiditSessionId("uploads/id.pdf")).toBeNull();
    expect(parseDiditSessionId("e2e-session-123")).toBeNull();
    expect(parseDiditSessionId(null)).toBeNull();
  });
});

describe("normalizeComparisonResult", () => {
  it("maps didit result strings onto pills", () => {
    expect(normalizeComparisonResult("exact_match")).toBe("match");
    expect(normalizeComparisonResult("partial_match")).toBe("partial");
    expect(normalizeComparisonResult("mismatch")).toBe("differs");
    expect(normalizeComparisonResult(undefined)).toBe("unknown");
  });
});

describe("compareKycRecord", () => {
  it("matches exact values", () => {
    expect(compareKycRecord("Zainab Bello", "Zainab Bello")).toBe("match");
  });

  it("compares loose dates across formats", () => {
    expect(compareKycRecord("02 Jun 1996", "1996-06-02")).toBe("match");
    expect(compareKycRecord("14 Mar 1991", "14 Mar 1989")).toBe("differs");
  });

  it("matches digit-normalized phone numbers", () => {
    expect(compareKycRecord("0803 000 2291", "08030002291")).toBe("match");
  });

  it("flags partial name matches", () => {
    expect(compareKycRecord("Chidinma Eze", "Chidinma Okonkwo Eze")).toBe(
      "partial",
    );
  });

  it("returns unknown when a side is missing", () => {
    expect(compareKycRecord(null, "Zainab Bello")).toBe("unknown");
  });
});

describe("summarizeDecision", () => {
  const summary = summarizeDecision(decisionFixture);

  it("rounds the face match score", () => {
    expect(summary.faceMatchScore).toBe(94);
  });

  it("counts checks against the workflow features", () => {
    expect(summary.checksTotal).toBe(4);
    expect(summary.checksPassed).toBe(4);
  });

  it("builds the record check from the id lookup comparison", () => {
    expect(summary.recordCheck?.source).toBe("NIMC");
    expect(summary.recordCheck?.rows[0].result).toBe("match");
    expect(summary.recordCheck?.rows[1].result).toBe("differs");
  });

  it("collects document and selfie images", () => {
    expect(summary.documents.frontImage).toBe("https://img/front");
    expect(summary.documents.selfieImage).toBe("https://img/selfie");
  });

  it("reports session and screening metadata", () => {
    expect(summary.sessionFinished).toBe(true);
    expect(summary.amlHits).toBe(0);
    expect(summary.warnings[0]?.short_description).toBe("Photo quality is low");
  });
});

describe("extractCachedDecisionFields", () => {
  it("caches the queue fields from a decision payload", () => {
    const fields = extractCachedDecisionFields(decisionFixture);
    expect(fields.faceMatchScore).toBe(94);
    expect(fields.idType).toBe("passport");
    expect(fields.idNumber).toBe("A04471571");
    expect(fields.checksTotal).toBe(4);
  });

  it("returns nulls for legacy flat webhook payloads", () => {
    const fields = extractCachedDecisionFields({
      status: "Review",
      full_name: "X",
    });
    expect(fields.checksTotal).toBeNull();
    expect(fields.faceMatchScore).toBeNull();
  });
});

describe("buildResubmitNodes", () => {
  it("maps redo choices onto didit nodes", () => {
    expect(
      buildResubmitNodes(decisionFixture, ["selfie", "date_of_birth"]),
    ).toEqual([
      { node_id: "feature_liveness_1", feature: "liveness" },
      { node_id: "feature_id_1", feature: "id_verification" },
    ]);
  });

  it("returns empty when node ids are unavailable", () => {
    expect(buildResubmitNodes({}, ["selfie"])).toEqual([]);
  });
});
