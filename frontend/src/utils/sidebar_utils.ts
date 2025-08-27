export const SidebarPages = {
  FEEDS: "Feeds",
  MY_CAMPAIGNS: "My Campaigns",
  WALLET: "Wallet",
  PROFILE: "Profile",
//   SETTINGS: "Settings",
} as const;

export type SidebarPage = (typeof SidebarPages)[keyof typeof SidebarPages];
