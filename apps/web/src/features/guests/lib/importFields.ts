/**
 * The guest fields a spreadsheet column can be mapped to on import, and the
 * header names we guess each from (including names seen in wedding-site
 * exports — not verified against any one site's exact format, so the dialog
 * asks people to check the guesses).
 */

export type ImportField =
  | "name"
  | "firstName"
  | "lastName"
  | "partnerFirstName"
  | "partnerLastName"
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
  { field: "partnerFirstName", label: "Partner first name" },
  { field: "partnerLastName", label: "Partner last name" },
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
  // Party-per-row exports: a second person on the same row (see also PARTNER_PATTERNS).
  "partner first name": "partnerFirstName",
  "partner's first name": "partnerFirstName",
  "partner name": "partnerFirstName",
  "partner full name": "partnerFirstName",
  "partner last name": "partnerLastName",
  "partner's last name": "partnerLastName",
  "partner surname": "partnerLastName",
};

/**
 * Headers that only name a field when the column's values fit it. "Type" is
 * "Adult" / "Child" in some exports but "Primary" / "Plus-one" in others.
 */
const VALUE_CHECKED_ALIASES: Record<string, Exclude<ImportField, "ignore">> = {
  type: "isChild",
  "guest type": "isChild",
};

/** Values an adult/child column holds. */
const AGE_VALUE = /^(adults?|child(ren)?|kids?|infants?|bab(y|ies)|toddlers?|teens?|youth)$/i;

/** How exports name the second person on a row: "Partner", "Plus one", "+1", "Guest 2"… */
const PARTNER = String.raw`(partner|spouse|plus[ -]?one|\+ ?1|guest 2|second guest)`;

/** Checked before HEADER_PATTERNS: "Plus One First Name" is the partner's, not the guest's. */
const PARTNER_PATTERNS: [RegExp, Exclude<ImportField, "ignore">][] = [
  [new RegExp(String.raw`${PARTNER}.*\b(last name|surname)\b`), "partnerLastName"],
  [new RegExp(String.raw`${PARTNER}.*\bname\b`), "partnerFirstName"],
];

/** Looser matches for headers that aren't an exact alias ("Guest First Name", "RSVP - Wedding"). */
const HEADER_PATTERNS: [RegExp, Exclude<ImportField, "ignore">][] = [
  ...PARTNER_PATTERNS,
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

/**
 * The field a header names, or null if we don't recognise it. `values` (the
 * column's data cells) settles headers like "Type" that only sometimes name a
 * field; without values those headers aren't recognised.
 */
export function fieldForHeader(
  text: string,
  values: readonly string[] = [],
): Exclude<ImportField, "ignore"> | null {
  const header = normaliseHeader(text);
  if (!header) return null;
  const checked = VALUE_CHECKED_ALIASES[header];
  if (checked) {
    const filled = values.map((value) => value.trim()).filter(Boolean);
    return filled.length > 0 && filled.every((value) => AGE_VALUE.test(value)) ? checked : null;
  }
  const exact = HEADER_ALIASES[header];
  if (exact) return exact;
  for (const [pattern, field] of HEADER_PATTERNS) if (pattern.test(header)) return field;
  return null;
}
