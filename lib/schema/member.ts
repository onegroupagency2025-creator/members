import { z } from "zod";

const emptyToUndefined = <T>(value: T) => {
  if (value === "" || value === null) {
    return undefined;
  }
  return value;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.number().min(0, "0以上で入力してください").optional(),
);

const dateString = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
    .optional(),
);

export const insuranceTypeEnum = z.enum(["国保", "社保", "なし"]);
export const employmentStatusEnum = z.enum([
  "正社員",
  "個人事業主",
  "フリーター",
  "生活保護等",
]);
export const livingStatusEnum = z.enum(["単身", "シェアハウス", "実家", "同棲など"]);
export const disabilityHandbookEnum = z.enum(["精神", "なし"]);
export const maritalStatusEnum = z.enum(["既婚", "未婚"]);

export const memberFormSchema = z.object({
  id: z.string().uuid().optional(),
  last_name: z.string().min(1, "必須です"),
  first_name: z.string().min(1, "必須です"),
  last_name_kana: optionalString,
  first_name_kana: optionalString,
  birth_date: dateString,
  age: optionalNumber,
  phone_number: optionalString,
  postal_code: optionalString,
  address_1: optionalString,
  address_2: optionalString,
  insurance_type: z.preprocess(emptyToUndefined, insuranceTypeEnum.optional()),
  employment_status: z.preprocess(emptyToUndefined, employmentStatusEnum.optional()),
  living_status: z.preprocess(emptyToUndefined, livingStatusEnum.optional()),
  disability_handbook: z.preprocess(
    emptyToUndefined,
    disabilityHandbookEnum.optional(),
  ),
  hospital_visit_history: z.boolean().optional(),
  symptoms: optionalString,
  hospital_name: optionalString,
  occupation: optionalString,
  workplace: optionalString,
  marital_status: z.preprocess(emptyToUndefined, maritalStatusEnum.optional()),
  annual_income: optionalNumber,
  is_on_welfare: z.boolean().optional(),
  past_welfare_usage: z.boolean().optional(),
  background: optionalString,
  involvement: optionalString,
  raw_data: optionalString,
});
