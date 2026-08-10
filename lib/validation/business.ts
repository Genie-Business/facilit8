import { z } from "zod";

export const REGISTRATION_TYPES = [
  "PRIVATE_INCORPORATED",
  "INCORPORATED_TRUSTEES",
  "BUSINESS_NAME",
  "FREE_ZONE",
  "GOV",
  "PRIVATE_INCORPORATED_GOV",
  "COOPERATIVE_SOCIETY",
  "PUBLIC_INCORPORATED",
] as const;

export const REGISTRATION_TYPE_LABELS: Record<string, string> = {
  PRIVATE_INCORPORATED: "Private Incorporated",
  INCORPORATED_TRUSTEES: "Incorporated Trustees",
  BUSINESS_NAME: "Business Name",
  FREE_ZONE: "Free Zone",
  GOV: "Government",
  PRIVATE_INCORPORATED_GOV: "Private Incorporated (Government)",
  COOPERATIVE_SOCIETY: "Cooperative Society",
  PUBLIC_INCORPORATED: "Public Incorporated",
};

// Verbatim from Anchor's confirmed industry enum
// (https://docs.getanchor.co/docs/business-customer-requirements, "Registration Types and
// Industry" accordion) — do not reformat these strings, they're sent to Anchor as-is.
export const INDUSTRIES = [
  "Agriculture_AgriculturalCooperatives",
  "Agriculture_AgriculturalServices",
  "Commerce_Automobiles",
  "Commerce_DigitalGoods",
  "Commerce_PhysicalGoods",
  "Commerce_RealEstate",
  "Commerce_DigitalServices",
  "Commerce_LegalServices",
  "Commerce_PhysicalServices",
  "Commerce_ProfessionalServices",
  "Commerce_OtherProfessionalServices",
  "Education_NurserySchools",
  "Education_PrimarySchools",
  "Education_SecondarySchools",
  "Education_TertiaryInstitutions",
  "Education_VocationalTraining",
  "Education_VirtualLearning",
  "Education_OtherEducationalServices",
  "Gaming_Betting",
  "Gaming_Lotteries",
  "Gaming_PredictionServices",
  "FinancialServices_FinancialCooperatives",
  "FinancialServices_CorporateServices",
  "FinancialServices_PaymentSolutionServiceProviders",
  "FinancialServices_Insurance",
  "FinancialServices_Investments",
  "FinancialServices_AgriculturalInvestments",
  "FinancialServices_Lending",
  "FinancialServices_BillPayments",
  "FinancialServices_Payroll",
  "FinancialServices_Remittances",
  "FinancialServices_Savings",
  "FinancialServices_MobileWallets",
  "Health_Gyms",
  "Health_Hospitals",
  "Health_Pharmacies",
  "Health_HerbalMedicine",
  "Health_Telemedicine",
  "Health_MedicalLaboratories",
  "Hospitality_Hotels",
  "Hospitality_Restaurants",
  "Nonprofits_ProfessionalAssociations",
  "Nonprofits_GovernmentAgencies",
  "Nonprofits_NGOs",
  "Nonprofits_PoliticalParties",
  "Nonprofits_ReligiousOrganizations",
  "Nonprofits_Leisure_Entertainment",
  "Nonprofits_Cinemas",
  "Nonprofits_Nightclubs",
  "Nonprofits_Events",
  "Nonprofits_Press_Media",
  "Nonprofits_RecreationCentres",
  "Nonprofits_StreamingServices",
  "Logistics_CourierServices",
  "Logistics_FreightServices",
  "Travel_Airlines",
  "Travel_Ridesharing",
  "Travel_TourServices",
  "Travel_Transportation",
  "Travel_TravelAgencies",
  "Utilities_CableTelevision",
  "Utilities_Electricity",
  "Utilities_Garbage_Disposal",
  "Utilities_Internet",
  "Utilities_Telecoms",
  "Utilities_Water",
  "Retail",
  "Wholesale",
  "Restaurants",
  "Construction",
  "Unions",
  "RealEstate",
  "FreelanceProfessional",
  "OtherProfessionalServices",
  "OtherEducationServices",
] as const;

/** Turns "FinancialServices_MobileWallets" into "Financial Services — Mobile Wallets". */
export function formatIndustryLabel(value: string): string {
  const spaced = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const parts = value.split("_").map(spaced);
  return parts.join(" — ");
}

export const businessVerificationSchema = z.object({
  cacNumber: z.string().trim().min(1, "CAC/RC number is required."),
  businessBvn: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "Business BVN must be exactly 11 digits."),
  businessDescription: z.string().trim().min(1, "A short business description is required.").max(500),
  industry: z.enum(INDUSTRIES),
  registrationType: z.enum(REGISTRATION_TYPES),
  dateOfRegistration: z
    .string()
    .min(1, "Date of registration is required.")
    .refine((v) => new Date(v) < new Date(), "Date of registration must be in the past."),
  addressLine1: z.string().trim().min(1, "Business address is required."),
  city: z.string().trim().min(1, "City is required."),
  state: z.string().trim().min(1, "State is required."),
});

export type BusinessVerificationInput = z.infer<typeof businessVerificationSchema>;
