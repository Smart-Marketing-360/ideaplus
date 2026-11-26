export interface BrandConfig {
  appName: string;
  shortName: string;
  tagline: string;
  dailyTagline: string;
  companyName: string;
  logoUrl?: string;
  supportEmail: string;
  colors: {
    navy: string;
    navyDark: string;
    gold: string;
    cream: string;
    creamDark: string;
    paper: string;
    line: string;
  };
  defaults: {
    currencySymbol: string;
    dailyCheckLabels: string[];
    timeAuditSlotLabels: string[];
  };
}

export const brandConfig: BrandConfig = {
  appName: "Business Diary",
  shortName: "BizDiary",
  tagline: "Strategic Execution & Daily Performance Journal",
  dailyTagline: "1% Improvement → leads to → No 1",
  companyName: "IdeaPlus Business Systems",
  logoUrl: "/logo.png",
  supportEmail: "support@ideaplus.local",
  colors: {
    navy: "#2A3B6B",
    navyDark: "#1B2647",
    gold: "#F2B230",
    cream: "#F6EBD3",
    creamDark: "#E7D4AF",
    paper: "#FFFFFF",
    line: "rgba(42, 59, 107, 0.18)",
  },
  defaults: {
    currencySymbol: "₹",
    dailyCheckLabels: [
      "Prayer / Meditation",
      "Mind Fitness (Reading / Learning)",
      "Physical Fitness",
      "Family & Personal Time"
    ],
    timeAuditSlotLabels: [
      "Slot 1: Morning Focus (6 AM - 10 AM)",
      "Slot 2: Peak Execution (10 AM - 2 PM)",
      "Slot 3: Review & Operations (2 PM - 6 PM)",
      "Slot 4: Strategy & Growth (6 PM - 9 PM)"
    ]
  }
};
