// Every fact on this page comes from the client brief / unipanelsa.co.za. Do not add to it without a source.

export type CityId = "jhb" | "cpt" | "dbn";

/** Opening hours as [open, close] in 24h "HH:MM", SAST. Day index 0 = Sunday. */
export type WeekHours = Record<0 | 1 | 2 | 3 | 4 | 5 | 6, [string, string] | null>;

export interface Showroom {
  id: CityId;
  city: string;
  region: string;
  street: string;
  suburb: string;
  postcode: string;
  phone: string;
  phoneHref: string;
  email: string;
  hours: WeekHours;
  hoursText: string[];
  mapsUrl: string;
}

export const SHOWROOMS: Showroom[] = [
  {
    id: "jhb",
    city: "Johannesburg",
    region: "Gauteng",
    street: "6 Kramer Road",
    suburb: "Kramerville, Sandton",
    postcode: "2090",
    phone: "+27 87 284 4590",
    phoneHref: "tel:+27872844590",
    email: "sales.jhb@unipanelsa.co.za",
    hours: { 0: null, 1: ["08:00", "17:00"], 2: ["08:00", "17:00"], 3: ["08:00", "17:00"], 4: ["08:00", "17:00"], 5: ["08:00", "17:00"], 6: ["09:00", "14:00"] },
    hoursText: ["Mon–Fri 08:00–17:00", "Sat 09:00–14:00", "Closed Sundays & public holidays"],
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=6+Kramer+Road+Kramerville+Sandton+2090",
  },
  {
    id: "cpt",
    city: "Cape Town",
    region: "Western Cape",
    street: "8 Marine Drive",
    suburb: "Paarden Eiland",
    postcode: "7405",
    phone: "+27 21 065 1674",
    phoneHref: "tel:+27210651674",
    email: "sales.cpt@unipanelsa.co.za",
    hours: { 0: null, 1: ["08:00", "17:00"], 2: ["08:00", "17:00"], 3: ["08:00", "17:00"], 4: ["08:00", "17:00"], 5: ["08:00", "17:00"], 6: ["09:00", "14:00"] },
    hoursText: ["Mon–Fri 08:00–17:00", "Sat 09:00–14:00", "Closed Sundays & public holidays"],
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=8+Marine+Drive+Paarden+Eiland+Cape+Town+7405",
  },
  {
    id: "dbn",
    city: "Durban",
    region: "KwaZulu-Natal",
    street: "287 Balfour Road",
    suburb: "Jacobs",
    postcode: "4026",
    phone: "+27 31 468 5320",
    phoneHref: "tel:+27314685320",
    email: "sales.dbn@unipanelsa.co.za",
    hours: { 0: null, 1: ["07:00", "16:30"], 2: ["07:00", "16:30"], 3: ["07:00", "16:30"], 4: ["07:00", "16:30"], 5: ["07:00", "15:30"], 6: ["07:30", "12:30"] },
    hoursText: ["Mon–Thu 07:00–16:30", "Fri 07:00–15:30", "Sat 07:30–12:30", "Closed Sundays & public holidays"],
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=287+Balfour+Road+Jacobs+Durban+4026",
  },
];

export const showroomById = (id: CityId) => SHOWROOMS.find((s) => s.id === id)!;

export const SITE = {
  name: "UnipanelSA",
  legalName: "Unipanel SA",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://demo.pixelcode.co.za") + (process.env.NEXT_PUBLIC_BASE_PATH ?? "/unipanel"),
  liveSite: "https://unipanelsa.co.za",
  instagram: "https://www.instagram.com/unipanel_sa/",
  instagramHandle: "@unipanel_sa",
  brochure: "https://unipanelsa.co.za/unipanel-brochure-june-2025/",
  taglines: {
    primary: "Luxury European Surfaces",
    fingertips: "The World’s Best Interior Kitchen Doors and Panels at your fingertips",
    endless: "Discover Endless Applications and Colours",
    sample: "Order your Sample Box today",
  },
  ksa: "Proud member of the Kitchen Specialists Association (KSA)",
  description:
    "South Africa’s premium supplier of imported European interior boards: kitchen doors, panels, wardrobes and interiors. Showrooms in Johannesburg, Cape Town and Durban.",
};

export const SERVICES = [
  {
    id: "build-ups",
    no: "01",
    title: "Build-ups",
    short: "36 to 54mm",
    body: "Build-ups from 36mm to 54mm for desktops, tabletops, TV unit frames, shelving and more.",
  },
  {
    id: "cutting-edging",
    no: "02",
    title: "Cutting & Edging",
    short: "Zero Glue Line",
    body: "Cutting on computer-driven beam saws for efficient, accurate panels. Edge banding with a specialised PUR glue system and our signature Zero Glue Line guarantee, giving boards the best chance in high-moisture areas.",
  },
  {
    id: "processing",
    no: "03",
    title: "Door & Panel Processing",
    short: "Residential & commercial",
    body: "Each step designed around your specification, for small residential projects and large commercial undertakings alike, with open communication throughout.",
  },
  {
    id: "cnc",
    no: "04",
    title: "CNC Routing",
    short: "Custom components",
    body: "Intricate designs for custom furniture and unique components for architectural projects, routed with high accuracy.",
  },
] as const;

export const NAV = [
  { href: "/boards/", label: "All Boards", no: "01" },
  { href: "/collections/", label: "Collections", no: "02" },
  { href: "/catalogue/", label: "Catalogue", no: "03" },
  { href: "/studio/", label: "The Studio", no: "04" },
  { href: "/exclusive/", label: "Exclusive Range", no: "05" },
  { href: "/services/", label: "Services", no: "06" },
  { href: "/inspiration/", label: "Spaces", no: "07" },
  { href: "/professionals/", label: "For Professionals", no: "08" },
  { href: "/showrooms/", label: "Showrooms", no: "09" },
  { href: "/about/", label: "Our Story", no: "10" },
  { href: "/journal/", label: "Journal", no: "11" },
  { href: "/contact/", label: "Contact", no: "12" },
] as const;
