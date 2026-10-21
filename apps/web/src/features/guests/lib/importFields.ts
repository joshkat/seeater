/**
 * The guest fields a spreadsheet column can be mapped to on import, and the
 * header names we recognise for each (including common wedding-site export
 * column names — not a guarantee of any one site's exact format).
 */

export type ImportField =
  | "name"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "rsvp"
  | "household"
  | "meal"
  | "dietary"
  | "accessibility"
  | "notes"
  | "tags"
  | "isChild"
  | "ignore";

/** Every mapping choice, in the order the column pickers list them. */
export const IMPORT_FIELDS: { field: ImportField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "firstName", label: "First name" },
  { field: "lastName", label: "Last name" },
  { field: "email", label: "Email" },
  { field: "phone", label: "Phone" },
  { field: "rsvp", label: "RSVP" },
  { field: "household", label: "Household" },
  { field: "meal", label: "Meal" },
  { field: "dietary", label: "Dietary" },
  { field: "accessibility", label: "Accessibility" },
  { field: "notes", label: "Notes" },
  { field: "tags", label: "Tags" },
  { field: "isChild", label: "Child" },
  { field: "ignore", label: "Ignore" },
];

export function importFieldLabel(field: ImportField): string {
  return IMPORT_FIELDS.find((entry) => entry.field === field)?.label ?? field;
}

/** Exact header names (normalised: lower case, single spaces, no trailing ":" or "*"). */
const HEADER_ALIASES: Record<string, Exclude<ImportField, "ignore">> = {
  name: "name",
  names: "name",
  "full name": "name",
  "guest name": "name",
  "guest full name": "name",
  "name of guest": "name",
  guest: "name",
  attendee: "name",
  "first name": "firstName",
  first: "firstName",
  "first names": "firstName",
  "given name": "firstName",
  firstname: "firstName",
  "last name": "lastName",
  last: "lastName",
  surname: "lastName",
  lastname: "lastName",
  email: "email",
  emails: "email",
  "e-mail": "email",
  "email address": "email",
  "e-mail address": "email",
  phone: "phone",
  phones: "phone",
  "phone number": "phone",
  mobile: "phone",
  "mobile number": "phone",
  cell: "phone",
  "cell phone": "phone",
  telephone: "phone",
  rsvp: "rsvp",
  "rsvp status": "rsvp",
  "rsvp response": "rsvp",
  attending: "rsvp",
  attendance: "rsvp",
  response: "rsvp",
  status: "rsvp",
  household: "household",
  "household name": "household",
  party: "household",
  "party name": "household",
  family: "household",
  invitation: "household",
  "invitation name": "household",
  meal: "meal",
  "meal choice": "meal",
  "meal selection": "meal",
  "meal preference": "meal",
  "meal option": "meal",
  entree: "meal",
  entrée: "meal",
  "entree selection": "meal",
  "entrée selection": "meal",
  menu: "meal",
  dietary: "dietary",
  diet: "dietary",
  "dietary needs": "dietary",
  "dietary requirements": "dietary",
  "dietary restrictions": "dietary",
  "dietary restriction": "dietary",
  allergies: "dietary",
  allergy: "dietary",
  "food allergies": "dietary",
  accessibility: "accessibility",
  "accessibility needs": "accessibility",
  mobility: "accessibility",
  notes: "notes",
  note: "notes",
  comments: "notes",
  comment: "notes",
  tags: "tags",
  tag: "tags",
  group: "tags",
  groups: "tags",
  side: "tags",
  child: "isChild",
  children: "isChild",
  kid: "isChild",
  "is child": "isChild",
  "age group": "isChild",
  "age category": "isChild",
  type: "isChild",
};

/** Looser matches for headers that aren't an exact alias ("Guest First Name", "RSVP - Wedding"). */
const HEADER_PATTERNS: [RegExp, Exclude<ImportField, "ignore">][] = [
  [/\bfirst name\b/, "firstName"],
  [/\b(last name|surname)\b/, "lastName"],
  [/\brsvp\b/, "rsvp"],
  [/\be-?mail\b/, "email"],
  [/\b(phone|mobile)\b/, "phone"],
  [/\b(meal|entr[eé]e)\b/, "meal"],
  [/\b(dietary|allerg)/, "dietary"],
];

export function normaliseHeader(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s:*]+$/, "");
}

/** The field a header names, or null if we don't recognise it. */
export function fieldForHeader(text: string): Exclude<ImportField, "ignore"> | null {
  const header = normaliseHeader(text);
  if (!header) return null;
  const exact = HEADER_ALIASES[header];
  if (exact) return exact;
  for (const [pattern, field] of HEADER_PATTERNS) if (pattern.test(header)) return field;
  return null;
}
