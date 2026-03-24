import type { Country, Currency, AgeGroup, Subject } from "@/types";

export interface GradeConfig {
  gradeId: string;         // canonical ID stored on the child record
  displayName: string;     // shown in UI
  ageGroup: AgeGroup;      // maps to question partition key
  curriculumName: string;  // e.g. "ACARA", "Common Core", "NCERT", "UK National Curriculum"
  keystage?: string;       // UK only
}

export interface CountryConfig {
  name: string;
  flag: string;
  currency: Currency;
  currencySymbol: string;
  grades: GradeConfig[];
  /** Prices in minor currency units (cents / paise / pence) */
  prices: {
    weekly: number;
    annual: number;
  };
}

export const COUNTRY_CONFIGS: Record<Country, CountryConfig> = {
  AU: {
    name: "Australia",
    flag: "🇦🇺",
    currency: "AUD",
    currencySymbol: "A$",
    prices: { weekly: 1100, annual: 39000 }, // AUD $11/wk, $390/yr
    grades: [
      { gradeId: "foundation", displayName: "Foundation", ageGroup: "foundation", curriculumName: "ACARA" },
      { gradeId: "year1",      displayName: "Year 1",     ageGroup: "year1",      curriculumName: "ACARA" },
      { gradeId: "year2",      displayName: "Year 2",     ageGroup: "year2",      curriculumName: "ACARA" },
      { gradeId: "year3",      displayName: "Year 3",     ageGroup: "year3",      curriculumName: "ACARA" },
      { gradeId: "year4",      displayName: "Year 4",     ageGroup: "year4",      curriculumName: "ACARA" },
      { gradeId: "year5",      displayName: "Year 5",     ageGroup: "year5",      curriculumName: "ACARA" },
      { gradeId: "year6",      displayName: "Year 6",     ageGroup: "year6",      curriculumName: "ACARA" },
    ],
  },
  US: {
    name: "United States",
    flag: "🇺🇸",
    currency: "USD",
    currencySymbol: "$",
    prices: { weekly: 700, annual: 25000 }, // USD $7/wk, $250/yr
    grades: [
      { gradeId: "kindergarten", displayName: "Kindergarten", ageGroup: "foundation", curriculumName: "Common Core" },
      { gradeId: "grade1",       displayName: "Grade 1",      ageGroup: "year1",      curriculumName: "Common Core" },
      { gradeId: "grade2",       displayName: "Grade 2",      ageGroup: "year2",      curriculumName: "Common Core" },
      { gradeId: "grade3",       displayName: "Grade 3",      ageGroup: "year3",      curriculumName: "Common Core" },
      { gradeId: "grade4",       displayName: "Grade 4",      ageGroup: "year4",      curriculumName: "Common Core" },
      { gradeId: "grade5",       displayName: "Grade 5",      ageGroup: "year5",      curriculumName: "Common Core" },
      { gradeId: "grade6",       displayName: "Grade 6",      ageGroup: "year6",      curriculumName: "Common Core" },
    ],
  },
  IN: {
    name: "India",
    flag: "🇮🇳",
    currency: "INR",
    currencySymbol: "₹",
    prices: { weekly: 60000, annual: 2100000 }, // INR ₹600/wk, ₹21,000/yr (in paise)
    grades: [
      { gradeId: "class1", displayName: "Class 1", ageGroup: "year1", curriculumName: "NCERT" },
      { gradeId: "class2", displayName: "Class 2", ageGroup: "year2", curriculumName: "NCERT" },
      { gradeId: "class3", displayName: "Class 3", ageGroup: "year3", curriculumName: "NCERT" },
      { gradeId: "class4", displayName: "Class 4", ageGroup: "year4", curriculumName: "NCERT" },
      { gradeId: "class5", displayName: "Class 5", ageGroup: "year5", curriculumName: "NCERT" },
      { gradeId: "class6", displayName: "Class 6", ageGroup: "year6", curriculumName: "NCERT" },
      { gradeId: "class7", displayName: "Class 7", ageGroup: "year7", curriculumName: "NCERT" },
      { gradeId: "class8", displayName: "Class 8", ageGroup: "year8", curriculumName: "NCERT" },
    ],
  },
  UK: {
    name: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    currencySymbol: "£",
    prices: { weekly: 600, annual: 20000 }, // GBP £6/wk, £200/yr (in pence)
    grades: [
      { gradeId: "reception", displayName: "Reception", ageGroup: "foundation", curriculumName: "UK National Curriculum", keystage: "KS1" },
      { gradeId: "year1",     displayName: "Year 1",    ageGroup: "year1",      curriculumName: "UK National Curriculum", keystage: "KS1" },
      { gradeId: "year2",     displayName: "Year 2",    ageGroup: "year2",      curriculumName: "UK National Curriculum", keystage: "KS1" },
      { gradeId: "year3",     displayName: "Year 3",    ageGroup: "year3",      curriculumName: "UK National Curriculum", keystage: "KS2" },
      { gradeId: "year4",     displayName: "Year 4",    ageGroup: "year4",      curriculumName: "UK National Curriculum", keystage: "KS2" },
      { gradeId: "year5",     displayName: "Year 5",    ageGroup: "year5",      curriculumName: "UK National Curriculum", keystage: "KS2" },
      { gradeId: "year6",     displayName: "Year 6",    ageGroup: "year6",      curriculumName: "UK National Curriculum", keystage: "KS2" },
    ],
  },
};

export function getCountryConfig(country: Country): CountryConfig {
  return COUNTRY_CONFIGS[country];
}

export function getGradeConfig(country: Country, gradeId: string): GradeConfig | undefined {
  return COUNTRY_CONFIGS[country]?.grades.find((g) => g.gradeId === gradeId);
}

export function gradeToAgeGroup(country: Country, gradeId: string): AgeGroup {
  return getGradeConfig(country, gradeId)?.ageGroup ?? "year3";
}

/** Format a minor-unit amount as a human-readable price string */
export function formatPrice(minorAmount: number, currency: Currency): string {
  const major = minorAmount / 100;
  const symbol = COUNTRY_CONFIGS[Object.keys(COUNTRY_CONFIGS).find(
    (k) => COUNTRY_CONFIGS[k as Country].currency === currency
  ) as Country]?.currencySymbol ?? currency;

  if (currency === "INR") {
    // INR stored in paise (×100), but display as whole rupees
    return `${symbol}${(minorAmount / 100).toLocaleString("en-IN")}`;
  }
  return `${symbol}${major.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Curriculum-specific topics per age group and subject
// ---------------------------------------------------------------------------

export const CURRICULUM_TOPICS: Record<AgeGroup, Record<Subject, string[]>> = {
  foundation: {
    maths:   ["counting 1-20", "basic addition", "basic subtraction", "2D shapes", "patterns", "size comparison"],
    english: ["phonics", "sight words", "letter recognition", "CVC words", "nursery rhymes"],
    science: ["living vs non-living", "weather", "seasons", "animals", "plants"],
  },
  year1: {
    maths:   ["counting to 100", "addition to 20", "subtraction to 20", "place value", "2D and 3D shapes", "patterns"],
    english: ["blending phonics", "simple sentences", "capital letters and full stops", "common nouns", "rhyming words"],
    science: ["animal habitats", "plant life cycles", "materials", "push and pull forces", "day and night"],
  },
  year2: {
    maths:   ["addition to 100", "subtraction to 100", "multiplication intro", "fractions halves and quarters", "measurement", "time to the hour"],
    english: ["compound words", "adjectives", "verb tenses", "question marks", "reading comprehension"],
    science: ["food chains", "life cycles", "states of matter", "light and shadows", "magnets"],
  },
  year3: {
    maths:   ["addition and subtraction to 1000", "multiplication tables 2-10", "division", "fractions", "perimeter", "time", "graphs"],
    english: ["spelling rules", "paragraphs", "conjunctions", "possessive apostrophes", "narrative writing"],
    science: ["rocks and soil", "light", "forces and magnets", "animals including humans", "plants"],
  },
  year4: {
    maths:   ["multiplication tables to 12", "long multiplication", "decimals", "Roman numerals", "area", "statistics"],
    english: ["prefixes and suffixes", "fronted adverbials", "determiners", "speech marks", "persuasive writing"],
    science: ["electricity", "sound", "digestion and teeth", "food webs", "classification"],
  },
  year5: {
    maths:   ["prime numbers", "factors and multiples", "long division", "fractions and percentages", "angles", "volume"],
    english: ["modal verbs", "relative clauses", "cohesion", "formal and informal writing", "inference"],
    science: ["Earth and space", "forces including gravity", "properties of materials", "life cycles", "human development"],
  },
  year6: {
    maths:   ["algebra", "ratio and proportion", "area and perimeter of shapes", "statistics and probability", "negative numbers"],
    english: ["active and passive voice", "subjunctive mood", "etymology", "literary devices", "summarising"],
    science: ["evolution and inheritance", "light", "electricity circuits", "living things classification", "the human body"],
  },
  year7: {
    maths:   ["integers and directed numbers", "algebraic expressions", "linear equations", "geometry angles", "data handling"],
    english: ["essay writing", "persuasion techniques", "grammar for effect", "comprehension strategies", "poetry analysis"],
    science: ["cells and organisms", "reproduction", "environment and ecology", "energy", "chemical reactions intro"],
  },
  year8: {
    maths:   ["simultaneous equations", "Pythagoras theorem", "probability", "compound interest", "transformations"],
    english: ["argument writing", "rhetoric", "critical analysis", "figurative language", "research skills"],
    science: ["atoms and elements", "periodic table", "waves", "inheritance and genetics", "ecosystems"],
  },
};

/** Returns topics for a given age group, subject, with optional country-specific overrides */
export function getTopicsForGrade(ageGroup: AgeGroup, subject: Subject, country: Country): string[] {
  const base = CURRICULUM_TOPICS[ageGroup]?.[subject] ?? CURRICULUM_TOPICS.year3[subject];

  // Country-specific additions
  if (country === "IN" && subject === "science" && ["year1", "year2", "year3"].includes(ageGroup)) {
    return [...base, "environment and conservation", "our helpers in the community"];
  }
  if (country === "UK" && subject === "english" && ageGroup === "year1") {
    return [...base, "phonics screening check preparation", "Year 1 common exception words"];
  }
  if (country === "US" && subject === "maths") {
    // Common Core emphasises word problems
    return [...base, "word problems", "number bonds"];
  }
  return base;
}
