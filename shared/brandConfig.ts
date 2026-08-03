/**
 * Keystone Growth OS — Client Branding Configuration Layer
 *
 * This file is the single source of truth for all brand-specific content.
 * To re-skin the app for a new client (e.g., Universal Paints), create a new
 * config object implementing BrandConfig and set it as the active config.
 * No component rebuilding is required.
 */

export interface BrandConfig {
  /** Client identifier — used for routing and analytics */
  clientId: string;
  /** Display name of the app */
  appName: string;
  /** Short tagline shown in the header and landing page */
  tagline: string;
  /** URL to the white/light logo image */
  logoUrl: string;
  /** URL to the dark/colour logo image (optional) */
  logoDarkUrl?: string;
  /** Primary website URL of the client */
  websiteUrl: string;

  /** Colour tokens — all in hex */
  colors: {
    primary: string;       // Main brand colour (teal/green)
    primaryDark: string;   // Darker shade of primary
    accent: string;        // Gold/highlight accent
    background: string;    // Page background
    surface: string;       // Card/panel surface
    text: string;          // Primary text
    textMuted: string;     // Secondary/muted text
    border: string;        // Border colour
    sidebar: string;       // Sidebar background
    sidebarText: string;   // Sidebar text colour
  };

  /** Module wording — allows per-client label overrides */
  modules: {
    audit: {
      title: string;
      subtitle: string;
      description: string;
    };
    blueprint: {
      title: string;
      subtitle: string;
      description: string;
    };
    goals: {
      title: string;
      subtitle: string;
      description: string;
    };
    moneyIdentity: {
      title: string;
      subtitle: string;
      triggerMessage: string;
      introHeading: string;
      introBody: string;
    };
    wealthReset: {
      title: string;
      subtitle: string;
      programmeLabel: string;
      programmeUrl: string;
      primaryCta: string;
      secondaryCta: string;
      ctaLabel: string;
    };
  };

  /** Contact and support */
  contact: {
    whatsapp?: string;
    email?: string;
  };
}

// ─── Keystone Business Group (Master Config) ─────────────────────────────────

export const keystoneConfig: BrandConfig = {
  clientId: "keystone",
  appName: "Keystone Growth OS",
  tagline: "Simple. Faster. Better.",
  logoUrl: "/manus-storage/keystone-logo-white_4f4fcec7.png",
  websiteUrl: "https://keystonebusinessgroup.co.za",

  colors: {
    primary: "#2D8B7A",       // Teal — from logo
    primaryDark: "#1A5C50",   // Deep teal
    accent: "#C9A84C",        // Gold — from logo
    background: "#0F1923",    // Dark navy background
    surface: "#162230",       // Slightly lighter navy for cards
    text: "#F0F4F8",          // Near-white text
    textMuted: "#8FA3B1",     // Muted blue-grey
    border: "#243447",        // Subtle border
    sidebar: "#0C1520",       // Darkest navy for sidebar
    sidebarText: "#D0E0EA",   // Light sidebar text
  },

  modules: {
    audit: {
      title: "Business Bottleneck Audit",
      subtitle: "Find what's holding your business back",
      description:
        "A five-dimension diagnostic across Sales, Cash, Staff, Systems, and Owner Behaviour. Identify your single biggest constraint in under 10 minutes.",
    },
    blueprint: {
      title: "Freedom Design Blueprint",
      subtitle: "Design the business that works for you",
      description:
        "A guided exploration of your owner behaviour, pressure points, goals, and growth vision — surfacing the friction that keeps you stuck.",
    },
    goals: {
      title: "Goal Dashboard",
      subtitle: "Your 90-day action focus",
      description:
        "Converts your Audit and Blueprint insights into a prioritised 90-day action plan with progress tracking.",
    },
    moneyIdentity: {
      title: "Money Identity Checkpoint",
      subtitle: "Understand your relationship with money",
      triggerMessage:
        "What would change in your business if the way you relate to money were no longer the invisible ceiling on your growth? Your answers point to a pattern worth understanding before we build your plan.",
      introHeading: "What is your money really doing?",
      introBody:
        "Every financial decision in your business is shaped by something deeper than strategy. This 5-minute diagnostic surfaces the pattern — your dominant money identity — so that the plan you build from here works with you, not against you.",
    },
    wealthReset: {
      title: "Wealth Reset Journey",
      subtitle: "Your 12-month financial transformation",
      programmeLabel: "Financial Wellness Programme",
      programmeUrl:
        "https://gentlewindcoaching.co.za/product/financial-wellness-programme-2-2-2/",
      primaryCta: "Understand My Money Pattern",
      secondaryCta: "What would the next 12 months look like?",
      ctaLabel: "Begin My Wealth Reset Journey",
    },
  },
  contact: {
    whatsapp: "27791333946",
    email: "info@keystonebusinessgroup.co.za",
  },
};
// ─── Universal Paints (Client Stub — ready for activation) ───────────────────

export const universalPaintsConfig: BrandConfig = {
  clientId: "universal-paints",
  appName: "Universal Paints Growth Hub",
  tagline: "Shop Management. Simplified.",
  logoUrl: "/manus-storage/keystone-logo-white_4f4fcec7.png", // Replace with UP logo when available
  websiteUrl: "https://universalpaints.co.za",

  colors: {
    primary: "#2D8B7A",
    primaryDark: "#1A5C50",
    accent: "#C9A84C",
    background: "#0F1923",
    surface: "#162230",
    text: "#F0F4F8",
    textMuted: "#8FA3B1",
    border: "#243447",
    sidebar: "#0C1520",
    sidebarText: "#D0E0EA",
  },

  modules: {
    audit: {
      title: "Shop Bottleneck Audit",
      subtitle: "Find what's slowing your store down",
      description:
        "A five-dimension diagnostic across Sales, Cash, Staff, Systems, and Owner Behaviour — tailored for Universal Paints store managers.",
    },
    blueprint: {
      title: "Store Freedom Blueprint",
      subtitle: "Design the store that runs without you",
      description:
        "A guided exploration of your management behaviour, pressure points, store goals, and growth vision.",
    },
    goals: {
      title: "Store Goal Dashboard",
      subtitle: "Your 90-day store management focus",
      description:
        "Converts your Audit and Blueprint insights into a prioritised 90-day action plan for your store.",
    },
    moneyIdentity: {
      title: "Money Identity Checkpoint",
      subtitle: "Understand your relationship with money",
      triggerMessage:
        "Your responses suggest that financial patterns may be influencing how you manage your store. Let's take 5 minutes to understand your money identity before building your action plan.",
      introHeading: "Discover Your Money Identity",
      introBody:
        "Your relationship with money shapes every financial decision you make — in your store and your life. This 5-minute diagnostic reveals your dominant money archetype and your next step to building a stronger financial foundation.",
    },
    wealthReset: {
      title: "Wealth Reset Journey",
      subtitle: "Your 12-month financial transformation",
      programmeLabel: "Financial Wellness Programme",
      programmeUrl:
        "https://gentlewindcoaching.co.za/product/financial-wellness-programme-2-2-2/",
      primaryCta: "Explore My Money Identity",
      secondaryCta: "Build My 12-Month Financial Roadmap",
      ctaLabel: "Begin My Wealth Reset Journey",
    },
  },

  contact: {
    whatsapp: "27791333946",
    email: "info@keystonebusinessgroup.co.za",
  },
};

// ─── Active Config ────────────────────────────────────────────────────────────
// Change this line to switch the entire app to a different client brand.

export const activeBrand: BrandConfig = keystoneConfig;
