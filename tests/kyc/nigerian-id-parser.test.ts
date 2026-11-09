/**
 * @jest-environment node
 */
import {
  parseNigerianIdDocument,
  normalizeOcrDate,
  sanitizeOcrDigits,
  parsePassportMrz,
} from "@/lib/kyc/nigerian-id-parser";

describe("Nigerian ID Document OCR Parser", () => {
  describe("1. Digit Sanitization & OCR Noise Removal", () => {
    it("corrects visual letter confusions in digit fields (O, I, l, S, B)", () => {
      // 1234 5678 901 with OCR noise 'O' for 0 and 'I' for 1
      const noisyText = "1234 5678 9O I";
      const sanitized = sanitizeOcrDigits(noisyText);
      expect(sanitized).toBe("12345678901");
    });

    it("corrects B -> 8 and S -> 5", () => {
      const noisy = "B5S0";
      expect(sanitizeOcrDigits(noisy)).toBe("8550");
    });

    it("strips out all non-digit characters", () => {
      expect(sanitizeOcrDigits("1122-3344-556")).toBe("11223344556");
      expect(sanitizeOcrDigits("1234 5678 901")).toBe("12345678901");
    });
  });

  describe("2. Date Normalization", () => {
    it("normalizes DD MMM YYYY textual dates to YYYY-MM-DD", () => {
      expect(normalizeOcrDate("12 AUG 1994")).toBe("1994-08-12");
      expect(normalizeOcrDate("05 Oct 2001")).toBe("2001-10-05");
      expect(normalizeOcrDate("1 Jan 1980")).toBe("1980-01-01");
      expect(normalizeOcrDate("28 FEB 1999")).toBe("1999-02-28");
    });

    it("normalizes numeric DD/MM/YYYY dates to YYYY-MM-DD", () => {
      expect(normalizeOcrDate("12/08/1994")).toBe("1994-08-12");
      expect(normalizeOcrDate("01-05-1990")).toBe("1990-05-01");
    });

    it("returns null for invalid or corrupted date strings", () => {
      expect(normalizeOcrDate("")).toBeNull();
      expect(normalizeOcrDate("NOT A DATE")).toBeNull();
    });
  });

  describe("3. Passport ICAO MRZ Parser (parsePassportMrz)", () => {
    it("parses 2-line TD3 Nigerian passport MRZ cleanly", () => {
      const mrzText = `
P<NGAJIMOH<<ADEIZA<OLUWASEUN<<<<<<<<<<<<<<<<<<
A123456787NGA9408125M2908124<<<<<<<<<<<<<<04
`;
      const result = parsePassportMrz(mrzText);

      expect(result.parsed).toBe(true);
      expect(result.passportNumber).toBe("A12345678");
      expect(result.surname).toBe("JIMOH");
      expect(result.givenNames).toBe("ADEIZA OLUWASEUN");
      expect(result.dob).toBe("1994-08-12");
    });

    it("handles non-passport or corrupted MRZ text gracefully", () => {
      const result = parsePassportMrz("Some random utility bill text without MRZ");
      expect(result.parsed).toBe(false);
    });
  });

  describe("4. End-to-End Nigerian ID Document Parser (parseNigerianIdDocument)", () => {
    it("parses NIMC Slip / Digital NIN Card with high confidence", () => {
      const ocrRaw = `
FEDERAL REPUBLIC OF NIGERIA
NATIONAL IDENTITY MANAGEMENT COMMISSION
NATIONAL IDENTIFICATION NUMBER SLIP (NINS)
NIN: 1234 5678 901
SURNAME: JIMOH
FIRST NAME: ADEIZA
MIDDLE NAME: OLUWASEUN
DATE OF BIRTH: 12 AUG 1994
GENDER: M
`;
      const doc = parseNigerianIdDocument(ocrRaw);

      expect(doc.documentType).toBe("nin_slip");
      expect(doc.idNumber).toBe("12345678901");
      expect(doc.idLast4).toBe("8901");
      expect(doc.surname).toBe("JIMOH");
      expect(doc.firstName).toBe("ADEIZA");
      expect(doc.middleName).toBe("OLUWASEUN");
      expect(doc.fullName).toBe("JIMOH ADEIZA OLUWASEUN");
      expect(doc.dateOfBirth).toBe("1994-08-12");
      expect(doc.confidence).toBe("high");
    });

    it("recovers 11-digit NIN even with OCR letter confusion (O instead of 0)", () => {
      const ocrRaw = `
NIMC
NATIONAL IDENTIFICATION NUMBER
NIN: 9876 5432 1O1
SURNAME: OKAFOR
FIRST NAME: CHINEDU
`;
      const doc = parseNigerianIdDocument(ocrRaw);

      expect(doc.documentType).toBe("nin_slip");
      expect(doc.idNumber).toBe("98765432101");
      expect(doc.idLast4).toBe("2101");
      expect(doc.surname).toBe("OKAFOR");
      expect(doc.firstName).toBe("CHINEDU");
    });

    it("parses Nigerian International Passport with MRZ", () => {
      const ocrRaw = `
FEDERAL REPUBLIC OF NIGERIA
PASSPORT
P<NGABELLO<<FATIMA<ZAHRA<<<<<<<<<<<<<<<<<<<<<<
B987654321NGA9805152F3005154<<<<<<<<<<<<<<02
`;
      const doc = parseNigerianIdDocument(ocrRaw);

      expect(doc.documentType).toBe("passport");
      expect(doc.idNumber).toBe("B98765432");
      expect(doc.idLast4).toBe("5432");
      expect(doc.surname).toBe("BELLO");
      expect(doc.firstName).toBe("FATIMA");
      expect(doc.middleName).toBe("ZAHRA");
      expect(doc.fullName).toBe("BELLO FATIMA ZAHRA");
      expect(doc.dateOfBirth).toBe("1998-05-15");
      expect(doc.confidence).toBe("high");
    });

    it("parses FRSC Driver's Licence", () => {
      const ocrRaw = `
FEDERAL REPUBLIC OF NIGERIA
FEDERAL ROAD SAFETY CORPS
NATIONAL DRIVERS LICENCE
KJA 12345 AA 01
NAME: ADEIZA JIMOH
CLASS: B
`;
      const doc = parseNigerianIdDocument(ocrRaw);

      expect(doc.documentType).toBe("driver_licence");
      expect(doc.idNumber).toBe("KJA12345AA01");
      expect(doc.idLast4).toBe("AA01");
      expect(doc.confidence).toBe("medium");
    });

    it("parses INEC Permanent Voter's Card (PVC)", () => {
      const ocrRaw = `
INDEPENDENT NATIONAL ELECTORAL COMMISSION
PERMANENT VOTER'S CARD
VIN: 90F5B12345678901234
STATE: LAGOS
`;
      const doc = parseNigerianIdDocument(ocrRaw);

      expect(doc.documentType).toBe("voter_card");
      expect(doc.idNumber).toBe("90F5B12345678901234");
      expect(doc.idLast4).toBe("1234");
    });

    it("returns unknown document type with low confidence for unrecognized text", () => {
      const doc = parseNigerianIdDocument("Electric Utility Bill 2026\nMeter: 123456");
      expect(doc.documentType).toBe("unknown");
      expect(doc.idNumber).toBeNull();
      expect(doc.confidence).toBe("low");
    });
  });
});
