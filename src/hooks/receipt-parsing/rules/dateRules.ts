import { ReceiptRule } from "./types";
import { createRegexMatchCondition } from "./conditionFactory";
import { parseDate } from "../utils";

/**
 * Collection of rules for detecting dates in receipts
 */
export const dateRules: ReceiptRule[] = [
  // Rule for Dutch date format (DD-MM-YYYY)
  {
    id: "date_dutch_format",
    name: "Dutch Date Format",
    description: "Detects dates in Dutch format DD-MM-YYYY",
    applicableFields: ["date"],
    conditions: [
      createRegexMatchCondition(/(\d{1,2})-(\d{1,2})-(\d{4})/), // DD-MM-YYYY pattern
    ],
    action: (elements, index) => {
      const match = elements[index].text.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed
        const year = parseInt(match[3], 10);

        // Validate date components
        if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
          const date = new Date(year, month, day);

          // Check for Dutch context (higher confidence if Dutch words nearby)
          let dutchContextBoost = 0;
          const dutchWords = [
            "totaal",
            "btw",
            "bedrag",
            "prijs",
            "euro",
            "bon",
          ];

          // Check surrounding text for Dutch context
          const surroundingRange = 3;
          for (
            let i = Math.max(0, index - surroundingRange);
            i <= Math.min(elements.length - 1, index + surroundingRange);
            i++
          ) {
            const elementText = elements[i].text.toLowerCase();
            for (const word of dutchWords) {
              if (elementText.includes(word)) {
                dutchContextBoost = 0.1;
                break;
              }
            }
            if (dutchContextBoost > 0) break;
          }

          return {
            field: "date",
            value: date,
            confidence: 0.95 + dutchContextBoost, // High confidence for Dutch date format
            ruleId: "date_dutch_format",
          };
        }
      }
      return null;
    },
    priority: 25, // High priority for Dutch receipts
  },
  // Rule for dates in format DD-MM-YYYY or MM/DD/YYYY based on detected format
  {
    id: "date_standard_format",
    name: "Standard Date Format",
    description:
      "Detects dates in standard formats, interpreting as DD/MM/YYYY for European and MM/DD/YYYY for US",
    applicableFields: ["date"],
    conditions: [
      createRegexMatchCondition(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/),
    ],
    action: (elements, index, matchedConditions, formatInfo) => {
      const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";

      // Extract the parts of the date
      const text = elements[index].text;
      const dateMatches = text.match(
        /\b(\d{1,2})([-/.])?(\d{1,2})\2?(\d{2,4})\b/
      );

      if (!dateMatches) return null;

      // Get the detected format (default to European if not specified)
      const isEuropeanFormat = formatInfo?.isEuropeanFormat !== false;

      // Extract the date components
      let day, month, year;

      if (isEuropeanFormat) {
        // European format: DD/MM/YYYY
        day = parseInt(dateMatches[1], 10);
        month = parseInt(dateMatches[3], 10) - 1; // JS months are 0-indexed
        year = parseInt(dateMatches[4], 10);

        // Handle 2-digit years
        if (year < 100) year += 2000;
      } else {
        // US format: MM/DD/YYYY
        month = parseInt(dateMatches[1], 10) - 1;
        day = parseInt(dateMatches[3], 10);
        year = parseInt(dateMatches[4], 10);

        // Handle 2-digit years
        if (year < 100) year += 2000;
      }

      // Validate date components
      if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
        const date = new Date(year, month, day);

        if (areDebugging) {
          console.log(
            `[Date Rule] Interpreted date ${text} as ${date.toISOString()} using ${
              isEuropeanFormat ? "European" : "US"
            } format`
          );
        }

        return {
          field: "date",
          value: date,
          confidence: 0.9,
          ruleId: "date_standard_format",
        };
      }
      return null;
    },
    priority: 10,
  },

  // Rule for dates in "DD Month YYYY" format
  {
    id: "date_text_month_format",
    name: "Text Month Date Format",
    description:
      'Detects dates in formats like "18 January 2023" or "18 Jan 2023"',
    applicableFields: ["date"],
    conditions: [
      createRegexMatchCondition(
        /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}\b/i
      ),
    ],
    action: (elements, index) => {
      const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";

      const parsedDate = parseDate(elements[index].text);
      if (parsedDate) {
        if (areDebugging) {
          console.log(
            `[Date Rule] Interpreted date ${
              elements[index].text
            } as ${parsedDate.toISOString()}`
          );
        }
        return {
          field: "date",
          value: parsedDate,
          confidence: 0.9,
          ruleId: "date_text_month_format",
        };
      }
      return null;
    },
    priority: 10,
  },

  // Rule for dates in "DD Month 'YY" format
  {
    id: "date_short_year_apostrophe",
    name: "Short Year with Apostrophe",
    description: "Detects dates in format like '18 May '23'",
    applicableFields: ["date"],
    conditions: [
      createRegexMatchCondition(
        /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+'\d{2}\b/i
      ),
    ],
    action: (elements, index) => {
      const parsedDate = parseDate(elements[index].text);
      if (parsedDate) {
        return {
          field: "date",
          value: parsedDate,
          confidence: 0.9,
          ruleId: "date_short_year_apostrophe",
        };
      }
      return null;
    },
    priority: 10,
  },

  // Rule for common Dutch date keywords
  {
    id: "date_dutch_keywords",
    name: "Dutch Date Keywords",
    description: 'Detects dates with Dutch keywords like "Datum:" or "Bon:"',
    applicableFields: ["date"],
    conditions: [
      createRegexMatchCondition(/\b(datum|bon|kassa|tijd)[\s:]+(.*)/i),
    ],
    action: (elements, index) => {
      const match = elements[index].text.match(
        /\b(datum|bon|kassa|tijd)[\s:]+(.*)/i
      );
      if (match && match[2]) {
        const potentialDate = match[2].trim();
        const parsedDate = parseDate(potentialDate);
        if (parsedDate) {
          return {
            field: "date",
            value: parsedDate,
            confidence: 0.8,
            ruleId: "date_dutch_keywords",
          };
        }
      }
      return null;
    },
    priority: 8,
  },

  // Rule for ISO format dates
  {
    id: "date_iso_format",
    name: "ISO Date Format",
    description: "Detects dates in ISO format like YYYY-MM-DD",
    applicableFields: ["date"],
    conditions: [
      createRegexMatchCondition(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/),
    ],
    action: (elements, index) => {
      const parsedDate = parseDate(elements[index].text);
      if (parsedDate) {
        return {
          field: "date",
          value: parsedDate,
          confidence: 0.9,
          ruleId: "date_iso_format",
        };
      }
      return null;
    },
    priority: 10,
  },
  
  // Rule for YYYY-MMM-DD format (e.g., "2025-jun-09 11:43")
  {
    id: "date_year_month_text_day_format",
    name: "Year Month(text) Day Format",
    description: "Detects dates in format like '2025-jun-09 11:43'",
    applicableFields: ["date"],
    conditions: [
      createRegexMatchCondition(/\b\d{4}-[a-z]{3}-\d{1,2}\b/i),
    ],
    action: (elements, index) => {
      const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";
      const text = elements[index].text;
      
      // Try to extract the date parts
      const match = text.match(/\b(\d{4})-(\w{3})-(\d{1,2})/i);
      
      if (match) {
        const year = parseInt(match[1], 10);
        const monthText = match[2].toLowerCase();
        const day = parseInt(match[3], 10);
        
        // Map month text to number (0-indexed)
        const monthMap: {[key: string]: number} = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'mai': 4, 'mei': 4, 'jun': 5, 'jul': 6,
          'aug': 7, 'sep': 8, 'oct': 9, 'okt': 9, 'nov': 10, 'dec': 11
        };
        
        const month = monthMap[monthText];
        
        // Validate the date parts
        if (month !== undefined && day > 0 && day <= 31 && year >= 2000) {
          const date = new Date(year, month, day);
          
          if (areDebugging) {
            console.log(
              `[Date Rule] Interpreted date ${text} as ${date.toISOString()} with YYYY-MMM-DD format`
            );
          }
          
          return {
            field: "date",
            value: date,
            confidence: 0.95, // High confidence for this specific format
            ruleId: "date_year_month_text_day_format",
          };
        }
      }
      
      return null;
    },
    priority: 25, // High priority
  },
];
