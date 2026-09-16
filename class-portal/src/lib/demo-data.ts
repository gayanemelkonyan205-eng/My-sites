import type { ViewerProfile } from "@/lib/types";

export const demoViewer: ViewerProfile = {
  id: "00000000-0000-4000-8000-000000000001",
  firstName: "Տիգրան",
  lastName: "Հովհաննիսյան",
  username: "tigran",
  role: "SUPER_ADMIN",
  avatarUrl: null,
  isActive: true
};

export const dashboardDemo = {
  lessons: [
    { time: "09:00", subject: "Հայոց լեզու", room: "203" },
    { time: "09:50", subject: "Ֆիզիկա", room: "Ֆիզիկայի կաբինետ" },
    { time: "10:40", subject: "Մաթեմատիկա", room: "208" }
  ],
  homework: [
    { subject: "Ֆիզիկա", title: "Լուծել §12-ի 4–7 խնդիրները", due: "Վաղը" },
    { subject: "Հայոց լեզու", title: "Վարժություն 38", due: "Ուրբաթ" }
  ],
  announcement: "Ուրբաթ օրը դասարանի ընդհանուր լուսանկարն է։ Խնդրում ենք չուշանալ։",
  event: "Դասարանի այցելություն թանգարան — 18 սեպտեմբերի",
  poll: "Ո՞ր օրը հարմար է դասարանի հանդիպման համար։"
} as const;
