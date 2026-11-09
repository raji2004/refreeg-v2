/**
 * Nigerian ID Document OCR Parser
 *
 * Robust parser for extracting identity fields across:
 * 1. NIMC Long Tracking Slip & Digital/Green NIN Slip & Plastic e-ID Card
 * 2. Nigerian International Passport (Visual inspection zone + ICAO MRZ Doc 9303)
 * 3. FRSC Nigerian Driver's Licence
 * 4. INEC Permanent Voter's Card (PVC)
 *
 * Designed to handle real-world worn cards, camera noise, OCR 0/O and 1/I confusion,
 * and multiline layouts.
 */

export interface ParsedNigerianId {
  documentType: "nin_slip" | "passport" | "driver_licence" | "voter_card" | "unknown";
  idNumber: string | null;
  idLast4: string | null;
  surname: string | null;
  firstName: string | null;
  middleName: string | null;
  fullName: string | null;
  dateOfBirth: string | null; // Normalized YYYY-MM-DD or DD/MM/YYYY
  confidence: "high" | "medium" | "low";
  rawMatchedText?: string;
  notes?: string[];
}

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/**
 * Normalizes common Nigerian date strings (e.g. '12 AUG 1994', '12-08-1994', '12/08/1994')
 * into YYYY-MM-DD format.
 */
export function normalizeOcrDate(rawDate: string): string | null {
  if (!rawDate) return null;
  const clean = rawDate.trim().replace(/[,.-]/g, " ");
  const parts = clean.split(/\s+/);

  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1].toLowerCase().slice(0, 3);
    let year = parts[2];

    // If month is text
    if (MONTHS[month]) {
      month = MONTHS[month];
    } else if (/^\d{1,2}$/.test(month)) {
      month = month.padStart(2, "0");
    }

    day = day.padStart(2, "0");
    if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month) && /^\d{2}$/.test(day)) {
      return `${year}-${month}-${day}`;
    }
  }

  // Fallback for standard ISO or DD/MM/YYYY
  const dmyMatch = rawDate.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

/**
 * Normalizes digits, replacing common OCR misreadings of digits in number fields:
 * 'O', 'o' -> '0'
 * 'I', 'l', '|' -> '1'
 * 'S', 's' -> '5'
 * 'B' -> '8'
 */
export function sanitizeOcrDigits(text: string): string {
  return text
    .replace(/[Oo]/g, "0")
    .replace(/[Il\|]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/[Bb]/g, "8")
    .replace(/\D/g, "");
}

/**
 * Parses ICAO 9303 TD3 Machine Readable Zone (Passport 2 lines x 44 characters)
 */
export function parsePassportMrz(text: string): {
  parsed: boolean;
  passportNumber?: string;
  surname?: string;
  givenNames?: string;
  dob?: string;
  expiry?: string;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().toUpperCase())
    .filter((l) => l.length >= 35);

  const line1 = lines.find((l) => l.startsWith("P<NGA") || l.startsWith("P<"));
  const line2Index = line1 ? lines.indexOf(line1) + 1 : -1;
  const line2 = line2Index >= 0 && line2Index < lines.length ? lines[line2Index] : null;

  if (!line1 || !line2) {
    return { parsed: false };
  }

  // Parse Line 1: P<NGASURNAME<<FIRSTNAME<MIDDLENAME<<<<
  const namePart = line1.slice(5).replace(/<+$/, "");
  const [surnameRaw, givenNamesRaw] = namePart.split("<<");
  const surname = surnameRaw ? surnameRaw.replace(/</g, " ").trim() : undefined;
  const givenNames = givenNamesRaw ? givenNamesRaw.replace(/</g, " ").trim() : undefined;

  // Parse Line 2: Passport (9 chars) + Check (1) + Nationality (3) + DOB (6 YYMMDD) + Check (1) + Sex (1) + Expiry (6 YYMMDD)...
  const passportNumber = line2.slice(0, 9).replace(/</g, "").trim();
  const dobRaw = line2.slice(13, 19);

  let dob: string | undefined;
  if (/^\d{6}$/.test(dobRaw)) {
    const yy = parseInt(dobRaw.slice(0, 2), 10);
    const mm = dobRaw.slice(2, 4);
    const dd = dobRaw.slice(4, 6);
    const currentYear = new Date().getFullYear() % 100;
    const century = yy > currentYear ? "19" : "20";
    dob = `${century}${dobRaw.slice(0, 2)}-${mm}-${dd}`;
  }

  return {
    parsed: true,
    passportNumber,
    surname,
    givenNames,
    dob,
  };
}

/**
 * Extracts NIMC NIN from text (11 digits, often grouped as '1234 5678 901' or '12345678901').
 */
function extractNin(text: string): string | null {
  // Check for labelled NIN
  const labelledMatch = text.match(/(?:NIN|NATIONAL\s*IDENTIFICATION\s*NUMBER|N\.I\.N)[\s\:\.\-]+([0-9OoIl\s]{11,15})/i);
  if (labelledMatch) {
    const digits = sanitizeOcrDigits(labelledMatch[1]);
    if (digits.length === 11) return digits;
  }

  // Check for standalone 11-digit sequences
  const tokens = text.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    // 4-4-3 format across 3 tokens
    if (i + 2 < tokens.length) {
      const combined = sanitizeOcrDigits(tokens[i] + tokens[i + 1] + tokens[i + 2]);
      if (combined.length === 11) return combined;
    }
    const single = sanitizeOcrDigits(tokens[i]);
    if (single.length === 11) return single;
  }

  return null;
}

/**
 * Parses NIMC Long Tracking Slip or Digital Green Slip.
 */
function parseNimcSlip(text: string): ParsedNigerianId | null {
  const isNimc =
    /NIMC|NATIONAL\s*IDENTITY\s*MANAGEMENT|NATIONAL\s*IDENTIFICATION|NIN/i.test(text);

  const nin = extractNin(text);
  if (!isNimc && !nin) return null;

  const notes: string[] = [];
  let surname: string | null = null;
  let firstName: string | null = null;
  let middleName: string | null = null;
  let dob: string | null = null;

  // Extract Surname
  const surnameMatch = text.match(/(?:SURNAME|LAST\s*NAME)[\s\:\.\-]+([A-Za-z]+)/i);
  if (surnameMatch) {
    surname = surnameMatch[1].trim();
  }

  // Extract First Name
  const firstMatch = text.match(/(?:FIRST\s*NAME|GIVEN\s*NAME)[\s\:\.\-]+([A-Za-z]+)/i);
  if (firstMatch) {
    firstName = firstMatch[1].trim();
  }

  // Extract Middle Name
  const middleMatch = text.match(/(?:MIDDLE\s*NAME|OTHER\s*NAME)[\s\:\.\-]+([A-Za-z]+)/i);
  if (middleMatch) {
    middleName = middleMatch[1].trim();
  }

  // Extract Date of Birth (stay on same line, don't greedily swallow newlines)
  const dobMatch = text.match(/(?:DOB|DATE\s*OF\s*BIRTH|BIRTH\s*DATE)[^\w\r\n]*([0-9A-Za-z \-\/\.]{8,20})(?:[\r\n]|$)/i);
  if (dobMatch) {
    dob = normalizeOcrDate(dobMatch[1]);
  }

  const idNumber = nin;
  const idLast4 = idNumber ? idNumber.slice(-4) : null;

  let confidence: "high" | "medium" | "low" = "low";
  if (idNumber && surname && firstName) {
    confidence = dob ? "high" : "medium";
  } else if (idNumber) {
    confidence = "medium";
  }

  const fullName = [surname, firstName, middleName].filter(Boolean).join(" ") || null;

  return {
    documentType: "nin_slip",
    idNumber,
    idLast4,
    surname,
    firstName,
    middleName,
    fullName,
    dateOfBirth: dob,
    confidence,
    notes,
  };
}

/**
 * Parses Nigerian International Passport.
 */
function parsePassport(text: string): ParsedNigerianId | null {
  const isPassport = /PASSPORT|FEDERAL\s*REPUBLIC\s*OF\s*NIGERIA/i.test(text) || text.includes("P<NGA");
  if (!isPassport) return null;

  const mrz = parsePassportMrz(text);
  if (mrz.parsed && mrz.passportNumber) {
    const idNumber = mrz.passportNumber;
    const idLast4 = idNumber.slice(-4);
    const givenParts = (mrz.givenNames || "").split(/\s+/);
    const firstName = givenParts[0] || null;
    const middleName = givenParts.slice(1).join(" ") || null;
    const surname = mrz.surname || null;
    const fullName = [surname, firstName, middleName].filter(Boolean).join(" ");

    return {
      documentType: "passport",
      idNumber,
      idLast4,
      surname,
      firstName,
      middleName,
      fullName: fullName || null,
      dateOfBirth: mrz.dob || null,
      confidence: "high",
      notes: ["Parsed via ICAO MRZ"],
    };
  }

  // Visual Inspection Zone Fallback
  const passportNumMatch = text.match(/(?:PASSPORT\s*NO|DOCUMENT\s*NO)[\s\:\.\-]+([A-Z0-9]{8,10})/i);
  const idNumber = passportNumMatch ? passportNumMatch[1].trim() : null;
  const idLast4 = idNumber ? idNumber.slice(-4) : null;

  return {
    documentType: "passport",
    idNumber,
    idLast4,
    surname: null,
    firstName: null,
    middleName: null,
    fullName: null,
    dateOfBirth: null,
    confidence: idNumber ? "medium" : "low",
    notes: ["Visual inspection parsed"],
  };
}

/**
 * Parses FRSC Nigerian Driver's Licence.
 */
function parseDriverLicence(text: string): ParsedNigerianId | null {
  const isDriverLicence =
    /FEDERAL\s*ROAD\s*SAFETY|NATIONAL\s*DRIVERS\s*LICENCE|FRSC/i.test(text);
  if (!isDriverLicence) return null;

  const licenceMatch = text.match(/\b([A-Z]{3}\s*\d{5}\s*[A-Z]{2}\s*\d{2})\b/i);
  const idNumber = licenceMatch ? licenceMatch[1].replace(/\s/g, "").toUpperCase() : null;
  const idLast4 = idNumber ? idNumber.slice(-4) : null;

  return {
    documentType: "driver_licence",
    idNumber,
    idLast4,
    surname: null,
    firstName: null,
    middleName: null,
    fullName: null,
    dateOfBirth: null,
    confidence: idNumber ? "medium" : "low",
  };
}

/**
 * Parses INEC Permanent Voter's Card (PVC).
 */
function parseVoterCard(text: string): ParsedNigerianId | null {
  const isVoter = /INEC|INDEPENDENT\s*NATIONAL\s*ELECTORAL|VOTER/i.test(text);
  if (!isVoter) return null;

  // VIN is typically 19 alphanumeric chars
  const vinMatch = text.match(/\b([A-Z0-9]{19})\b/i);
  const idNumber = vinMatch ? vinMatch[1].toUpperCase() : null;
  const idLast4 = idNumber ? idNumber.slice(-4) : null;

  return {
    documentType: "voter_card",
    idNumber,
    idLast4,
    surname: null,
    firstName: null,
    middleName: null,
    fullName: null,
    dateOfBirth: null,
    confidence: idNumber ? "medium" : "low",
  };
}

/**
 * Main OCR parser entrypoint for Nigerian ID cards and slips.
 */
export function parseNigerianIdDocument(ocrRawText: string): ParsedNigerianId {
  if (!ocrRawText || !ocrRawText.trim()) {
    return {
      documentType: "unknown",
      idNumber: null,
      idLast4: null,
      surname: null,
      firstName: null,
      middleName: null,
      fullName: null,
      dateOfBirth: null,
      confidence: "low",
      notes: ["Empty or unreadable OCR output"],
    };
  }

  // 1. Try Passport MRZ & Visual
  const passport = parsePassport(ocrRawText);
  if (passport && passport.confidence !== "low") return passport;

  // 2. Try NIMC Slip / Plastic NIN
  const nimc = parseNimcSlip(ocrRawText);
  if (nimc && nimc.confidence !== "low") return nimc;

  // 3. Try FRSC Driver's Licence
  const licence = parseDriverLicence(ocrRawText);
  if (licence && licence.confidence !== "low") return licence;

  // 4. Try INEC Voter's Card
  const voter = parseVoterCard(ocrRawText);
  if (voter && voter.confidence !== "low") return voter;

  // Fallback to highest detected match or unknown
  if (passport) return passport;
  if (nimc) return nimc;
  if (licence) return licence;
  if (voter) return voter;

  return {
    documentType: "unknown",
    idNumber: null,
    idLast4: null,
    surname: null,
    firstName: null,
    middleName: null,
    fullName: null,
    dateOfBirth: null,
    confidence: "low",
    notes: ["Could not classify Nigerian ID format with high confidence"],
  };
}
