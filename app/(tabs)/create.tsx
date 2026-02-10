import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Controller, type SubmitHandler, useForm } from "react-hook-form";

import {
  disabilityHandbookEnum,
  employmentStatusEnum,
  insuranceTypeEnum,
  livingStatusEnum,
  maritalStatusEnum,
  memberFormSchema,
} from "../../lib/schema/member";
import type { MemberFormValues } from "../../types/member";

type SegmentedOption = {
  label: string;
  value: string;
};

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "numeric" | "phone-pad";
  multiline?: boolean;
};

const SegmentedControl = ({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption[];
  value?: string;
  onChange: (nextValue: string) => void;
}) => {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={`${option.label}-${option.value}`}
            onPress={() => onChange(option.value)}
            className={`rounded-full border px-3 py-2 ${
              isActive
                ? "border-blue-600 bg-blue-50"
                : "border-slate-300 bg-slate-100"
            }`}
          >
            <Text
              className={`${isActive ? "text-blue-700" : "text-slate-700"} text-sm font-medium`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const ErrorText = ({ message }: { message?: string }) => {
  if (!message) {
    return null;
  }
  return <Text className="mt-1 text-xs text-rose-600">{message}</Text>;
};

const enumOptions = (values: readonly string[]) => [
  { label: "未選択", value: "" },
  ...values.map((value) => ({ label: value, value })),
];

const toOptionalNumber = (value: string) => {
  if (value.trim() === "") {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? undefined : numeric;
};

const toDigits = (value: string) => value.replace(/\D/g, "");

const splitPostalCode = (value?: string) => {
  const digits = toDigits(value ?? "");
  return [digits.slice(0, 3), digits.slice(3, 7)];
};

const mergePostalCode = (first: string, second: string) => {
  const left = toDigits(first).slice(0, 3);
  const right = toDigits(second).slice(0, 4);
  if (!left && !right) return "";
  return `${left}-${right}`;
};

const splitPhoneNumber = (value?: string) => {
  const digits = toDigits(value ?? "");
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11)];
};

const mergePhoneNumber = (first: string, second: string, third: string) => {
  const part1 = toDigits(first).slice(0, 3);
  const part2 = toDigits(second).slice(0, 4);
  const part3 = toDigits(third).slice(0, 4);
  if (!part1 && !part2 && !part3) return "";
  return `${part1}-${part2}-${part3}`;
};

const calculateAgeFromBirthDate = (birthDate: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return undefined;
  const [year, month, day] = birthDate.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - year;
  const thisYearBirthday = new Date(today.getFullYear(), month - 1, day);
  if (today < thisYearBirthday) {
    age -= 1;
  }
  return age >= 0 ? age : undefined;
};

const toTwoDigits = (value: number) => String(value).padStart(2, "0");

const GAS_ENDPOINT = process.env.EXPO_PUBLIC_GAS_ENDPOINT;
const DEBUG_ENDPOINT =
  "http://127.0.0.1:7245/ingest/75fc0327-d825-4be2-a8f7-e0f121740d02";

const sendDebugLog = (
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
  runId = "post-fix-1",
) => {
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
};

/** 保存時にGASへ送る payload。真偽値は「あり」「なし」に変換済み */
type GasMemberPayload = Omit<
  MemberFormValues,
  "hospital_visit_history" | "is_on_welfare" | "past_welfare_usage"
> & {
  hospital_visit_history?: "あり" | "なし";
  is_on_welfare?: "あり" | "なし";
  past_welfare_usage?: "あり" | "なし";
};

const submitMember = async (payload: GasMemberPayload) => {
  if (!GAS_ENDPOINT) {
    throw new Error("GASエンドポイントが設定されていません。");
  }

  // #region agent log
  sendDebugLog("H2", "app/(tabs)/create.tsx:submitMember:beforeFetch", "submitMember fetch start", {
    hasEndpoint: Boolean(GAS_ENDPOINT),
    endpointHost: (() => {
      try {
        return new URL(GAS_ENDPOINT).host;
      } catch {
        return "invalid-url";
      }
    })(),
    payloadHasBirthDate: Boolean(payload.birth_date),
    payloadHasPostalCode: Boolean(payload.postal_code),
  });
  // #endregion

  const response = await fetch(`${GAS_ENDPOINT}?action=submitMember`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // #region agent log
  sendDebugLog("H3", "app/(tabs)/create.tsx:submitMember:afterFetch", "submitMember fetch response", {
    ok: response.ok,
    status: response.status,
    redirected: response.redirected,
    responseUrl: response.url,
  });
  // #endregion

  if (!response.ok) {
    throw new Error("送信に失敗しました。");
  }

  return response.json();
};

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <View className="mb-5 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <Text className="mb-4 text-base font-semibold text-slate-900">{title}</Text>
      {children}
    </View>
  );
};

const FieldLabel = ({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) => {
  return (
    <View className="mb-2 flex-row items-center gap-2">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      {required ? (
        <View className="rounded-full bg-rose-100 px-2 py-0.5">
          <Text className="text-[10px] font-semibold text-rose-700">必須</Text>
        </View>
      ) : null}
    </View>
  );
};

const FormInput = ({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
}: InputProps) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#94a3b8"
    keyboardType={keyboardType}
    multiline={multiline}
    textAlignVertical={multiline ? "top" : "auto"}
    className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 ${
      multiline ? "min-h-[104px]" : ""
    }`}
  />
);

const BooleanField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: boolean;
  onChange: (next: boolean) => void;
}) => (
  <View className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
    <View className="flex-row items-center justify-between">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <Switch
        value={value ?? false}
        onValueChange={onChange}
        trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
      />
    </View>
  </View>
);

const CreateMemberScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [postalSearchLoading, setPostalSearchLoading] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const isWeb = Platform.OS === "web";
  const insuranceOptions = useMemo(
    () => enumOptions(insuranceTypeEnum.options),
    [],
  );
  const employmentOptions = useMemo(
    () => enumOptions(employmentStatusEnum.options),
    [],
  );
  const livingOptions = useMemo(() => enumOptions(livingStatusEnum.options), []);
  const disabilityOptions = useMemo(
    () => enumOptions(disabilityHandbookEnum.options),
    [],
  );
  const maritalOptions = useMemo(() => enumOptions(maritalStatusEnum.options), []);
  const birthYearOptions = useMemo(() => {
    const thisYear = new Date().getFullYear();
    return Array.from({ length: 120 }, (_, index) => String(thisYear - index));
  }, []);
  const birthMonthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => toTwoDigits(index + 1)),
    [],
  );
  const birthDayOptions = useMemo(() => {
    if (!birthYear || !birthMonth) {
      return Array.from({ length: 31 }, (_, index) => toTwoDigits(index + 1));
    }
    const maxDay = new Date(Number(birthYear), Number(birthMonth), 0).getDate();
    return Array.from({ length: maxDay }, (_, index) => toTwoDigits(index + 1));
  }, [birthMonth, birthYear]);

  const { control, handleSubmit, formState, reset, setValue, getValues, watch } =
    useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      last_name: "",
      first_name: "",
      last_name_kana: "",
      first_name_kana: "",
      birth_date: "",
      age: undefined,
      phone_number: "",
      postal_code: "",
      address_1: "",
      address_2: "",
      insurance_type: undefined,
      employment_status: undefined,
      living_status: undefined,
      disability_handbook: undefined,
      hospital_visit_history: false,
      symptoms: "",
      hospital_name: "",
      occupation: "",
      workplace: "",
      marital_status: undefined,
      annual_income: undefined,
      is_on_welfare: false,
      past_welfare_usage: false,
      background: "",
      involvement: "",
      raw_data: "",
    },
  });

  const onSubmit: SubmitHandler<MemberFormValues> = async (values) => {
    // #region agent log
    sendDebugLog("H1", "app/(tabs)/create.tsx:onSubmit:entry", "onSubmit called", {
      agreedPrivacy,
      isConfirming,
      hasEndpoint: Boolean(GAS_ENDPOINT),
      hasRequiredName: Boolean(values.last_name?.trim() && values.first_name?.trim()),
    });
    // #endregion

    if (!agreedPrivacy) {
      Alert.alert("確認", "個人情報の取り扱いに同意してください。");
      return;
    }
    if (!GAS_ENDPOINT) {
      Alert.alert("設定エラー", "GASエンドポイントが未設定です。");
      return;
    }

    setLoading(true);

    try {
      const raw_data = JSON.stringify({});
      const calculatedAge = values.birth_date
        ? calculateAgeFromBirthDate(values.birth_date)
        : undefined;
      const gasPayload: GasMemberPayload = {
        ...values,
        age: calculatedAge,
        raw_data,
        hospital_visit_history: values.hospital_visit_history ? "あり" : "なし",
        is_on_welfare: values.is_on_welfare ? "あり" : "なし",
        past_welfare_usage: values.past_welfare_usage ? "あり" : "なし",
      };
      // #region agent log
      sendDebugLog("H1", "app/(tabs)/create.tsx:onSubmit:beforeSubmitMember", "before submitMember", {
        birthDate: values.birth_date ?? "",
        calculatedAge: calculatedAge ?? null,
        phoneLength: (values.phone_number ?? "").length,
        postalLength: (values.postal_code ?? "").length,
      });
      // #endregion
      await submitMember(gasPayload);

      // #region agent log
      sendDebugLog("H3", "app/(tabs)/create.tsx:onSubmit:success", "submitMember success", {
        movedToSuccessAlert: true,
      });
      // #endregion

      reset();
      setAgreedPrivacy(false);
      setIsConfirming(false);
      setBirthYear("");
      setBirthMonth("");
      setBirthDay("");
      router.replace("/complete");
    } catch (error) {
      // #region agent log
      sendDebugLog("H4", "app/(tabs)/create.tsx:onSubmit:catch", "onSubmit caught error", {
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage:
          error instanceof Error ? error.message : "unexpected-non-error-thrown",
      });
      // #endregion
      Alert.alert(
        "送信エラー",
        error instanceof Error ? error.message : "予期せぬエラーが発生しました。",
      );
    } finally {
      setLoading(false);
    }
  };

  const onPressPostalSearch = async () => {
    const postal = getValues("postal_code") ?? "";
    const digits = toDigits(postal);
    if (digits.length !== 7) {
      Alert.alert("入力エラー", "郵便番号は7桁で入力してください。");
      return;
    }
    if (!GAS_ENDPOINT) {
      Alert.alert("設定エラー", "GASエンドポイントが未設定です。");
      return;
    }

    setPostalSearchLoading(true);
    try {
      const response = await fetch(
        `${GAS_ENDPOINT}?action=searchPostalCode&postal_code=${digits}`,
      );
      if (!response.ok) {
        throw new Error("住所検索に失敗しました。");
      }

      const result = (await response.json()) as {
        ok?: boolean;
        address_1?: string;
        address_2?: string;
        address1?: string;
        address2?: string;
        address?: string;
        error?: string;
      };

      if (!result.ok) {
        throw new Error(result.error || "該当する住所が見つかりません。");
      }

      const address1 = result.address_1 ?? result.address1 ?? result.address ?? "";
      const address2 = result.address_2 ?? result.address2 ?? "";

      if (!address1) {
        throw new Error("該当する住所が見つかりません。");
      }

      setValue("address_1", address1, { shouldValidate: true });
      setValue("address_2", address2, { shouldValidate: true });
      Alert.alert("住所検索", "住所を入力しました。");
    } catch (error) {
      Alert.alert(
        "住所検索エラー",
        error instanceof Error ? error.message : "住所検索に失敗しました。",
      );
    } finally {
      setPostalSearchLoading(false);
    }
  };

  const updateBirthDate = (nextYear: string, nextMonth: string, nextDay: string) => {
    const maxDay =
      nextYear && nextMonth
        ? new Date(Number(nextYear), Number(nextMonth), 0).getDate()
        : 31;
    const normalizedDay =
      nextDay && Number(nextDay) <= maxDay ? nextDay : nextDay ? "" : nextDay;

    setBirthYear(nextYear);
    setBirthMonth(nextMonth);
    setBirthDay(normalizedDay);

    if (nextYear && nextMonth && normalizedDay) {
      setValue("birth_date", `${nextYear}-${nextMonth}-${normalizedDay}`, {
        shouldValidate: true,
      });
      return;
    }

    // プルダウン途中選択時は無効な日付を送らない
    setValue("birth_date", "", { shouldValidate: true });
  };

  const watchedLastName = watch("last_name") ?? "";
  const watchedFirstName = watch("first_name") ?? "";
  const isRequiredFilled =
    watchedLastName.trim().length > 0 && watchedFirstName.trim().length > 0;
  const canMoveToConfirm = agreedPrivacy && isRequiredFilled && !loading;

  const onPressConfirm = handleSubmit(() => {
    // #region agent log
    sendDebugLog("H5", "app/(tabs)/create.tsx:onPressConfirm:callback", "confirm callback called", {
      canMoveToConfirm,
      agreedPrivacy,
      isRequiredFilled,
      loading,
      hasValidationErrors: Object.keys(formState.errors ?? {}).length > 0,
    });
    // #endregion
    if (!canMoveToConfirm) return;
    setIsConfirming(true);
  });

  const confirmValues = getValues();
  const formatBoolean = (value?: boolean) => (value ? "あり" : "なし");
  const formatNumber = (value?: number) =>
    value === undefined ? "" : value.toLocaleString("ja-JP");
  const summaryItems: Array<{ label: string; value: string }> = [
    {
      label: "氏名",
      value: `${confirmValues.last_name ?? ""} ${confirmValues.first_name ?? ""}`.trim(),
    },
    {
      label: "ふりがな",
      value: `${confirmValues.last_name_kana ?? ""} ${confirmValues.first_name_kana ?? ""}`.trim(),
    },
    { label: "生年月日", value: confirmValues.birth_date ?? "" },
    { label: "電話番号", value: confirmValues.phone_number ?? "" },
    { label: "郵便番号", value: confirmValues.postal_code ?? "" },
    { label: "住所A", value: confirmValues.address_1 ?? "" },
    { label: "住所B", value: confirmValues.address_2 ?? "" },
    { label: "保険証", value: confirmValues.insurance_type ?? "" },
    { label: "雇用形態", value: confirmValues.employment_status ?? "" },
    { label: "暮らし", value: confirmValues.living_status ?? "" },
    { label: "通院歴", value: formatBoolean(confirmValues.hospital_visit_history) },
    { label: "障害者手帳", value: confirmValues.disability_handbook ?? "" },
    { label: "症状", value: confirmValues.symptoms ?? "" },
    { label: "病院名", value: confirmValues.hospital_name ?? "" },
    { label: "職業", value: confirmValues.occupation ?? "" },
    { label: "職場", value: confirmValues.workplace ?? "" },
    { label: "既婚 / 未婚", value: confirmValues.marital_status ?? "" },
    { label: "昨年度年収", value: formatNumber(confirmValues.annual_income) },
    { label: "生活保護", value: formatBoolean(confirmValues.is_on_welfare) },
    { label: "過去の福祉利用", value: formatBoolean(confirmValues.past_welfare_usage) },
    { label: "経緯", value: confirmValues.background ?? "" },
    { label: "関わり", value: confirmValues.involvement ?? "" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 32,
            alignItems: isWeb ? "center" : "stretch",
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={isWeb ? { width: 420 } : { width: "100%", maxWidth: 860 }}>
            {isConfirming ? (
              <View className="mb-5 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                <Text className="text-xl font-bold text-slate-900">入力内容の確認</Text>
                <Text className="mt-2 text-sm leading-5 text-slate-600">
                  内容を確認して問題なければ「確定して保存」を押してください。
                </Text>
              </View>
            ) : (
            <View className="mb-5 rounded-3xl border border-blue-100 bg-blue-50 p-5">
              <Text className="text-xl font-bold text-slate-900">利用者情報の入力</Text>
              <Text className="mt-2 text-sm leading-5 text-slate-600">
                必須項目は赤色の「必須」チップで表示します。分かる範囲から入力して保存できます。
              </Text>
            </View>
            )}

            {isConfirming ? (
              <SectionCard title="確認内容">
                {summaryItems.map((item) => (
                  <View key={item.label} className="mb-3 border-b border-slate-100 pb-3">
                    <Text className="text-xs font-medium text-slate-500">{item.label}</Text>
                    <Text className="mt-1 text-sm text-slate-900">
                      {item.value?.trim() ? item.value : "未入力"}
                    </Text>
                  </View>
                ))}
                <View className="mt-1 rounded-2xl border border-green-100 bg-green-50 px-3 py-2">
                  <Text className="text-xs text-green-700">
                    個人情報の取り扱いに同意済みです。
                  </Text>
                </View>
              </SectionCard>
            ) : (
              <>
            <SectionCard title="基本情報">
            <FieldLabel label="姓" required />
            <Controller
              control={control}
              name="last_name"
              render={({ field }) => (
                <FormInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="例: 山田"
                />
              )}
            />
            <ErrorText message={formState.errors.last_name?.message} />

            <View className="mt-4">
              <FieldLabel label="名" required />
              <Controller
                control={control}
                name="first_name"
                render={({ field }) => (
                  <FormInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder="例: 太郎"
                  />
                )}
              />
              <ErrorText message={formState.errors.first_name?.message} />
            </View>

            <View className="mt-4">
              <FieldLabel label="姓（かな）" />
              <Controller
                control={control}
                name="last_name_kana"
                render={({ field }) => (
                  <FormInput
                    value={field.value ?? ""}
                    onChangeText={field.onChange}
                    placeholder="例: やまだ"
                  />
                )}
              />
              <ErrorText message={formState.errors.last_name_kana?.message} />
            </View>

            <View className="mt-4">
              <FieldLabel label="名（かな）" />
              <Controller
                control={control}
                name="first_name_kana"
                render={({ field }) => (
                  <FormInput
                    value={field.value ?? ""}
                    onChangeText={field.onChange}
                    placeholder="例: たろう"
                  />
                )}
              />
              <ErrorText message={formState.errors.first_name_kana?.message} />
            </View>

            <View className="mt-4">
              <FieldLabel label="生年月日" />
              <View className="flex-row items-center gap-2">
                <View className="flex-1 flex-row items-center">
                  <View className="h-12 flex-1 justify-center rounded-2xl border border-slate-200 bg-slate-50 px-1">
                    <Picker
                      selectedValue={birthYear}
                      onValueChange={(value) =>
                        updateBirthDate(String(value), birthMonth, birthDay)
                      }
                    >
                      <Picker.Item label="年" value="" />
                      {birthYearOptions.map((year) => (
                        <Picker.Item key={year} label={year} value={year} />
                      ))}
                    </Picker>
                  </View>
                  <Text className="ml-2 text-sm text-slate-600">年</Text>
                </View>
                <View className="flex-1 flex-row items-center">
                  <View className="h-12 flex-1 justify-center rounded-2xl border border-slate-200 bg-slate-50 px-1">
                    <Picker
                      selectedValue={birthMonth}
                      onValueChange={(value) =>
                        updateBirthDate(birthYear, String(value), birthDay)
                      }
                    >
                      <Picker.Item label="月" value="" />
                      {birthMonthOptions.map((month) => (
                        <Picker.Item key={month} label={month} value={month} />
                      ))}
                    </Picker>
                  </View>
                  <Text className="ml-2 text-sm text-slate-600">月</Text>
                </View>
                <View className="flex-1 flex-row items-center">
                  <View className="h-12 flex-1 justify-center rounded-2xl border border-slate-200 bg-slate-50 px-1">
                    <Picker
                      selectedValue={birthDay}
                      onValueChange={(value) =>
                        updateBirthDate(birthYear, birthMonth, String(value))
                      }
                    >
                      <Picker.Item label="日" value="" />
                      {birthDayOptions.map((day) => (
                        <Picker.Item key={day} label={day} value={day} />
                      ))}
                    </Picker>
                  </View>
                  <Text className="ml-2 text-sm text-slate-600">日</Text>
                </View>
              </View>
              <ErrorText message={formState.errors.birth_date?.message} />
            </View>
            </SectionCard>

            <SectionCard title="連絡先">
            <FieldLabel label="電話番号" />
            <Controller
              control={control}
              name="phone_number"
              render={({ field }) => {
                const [first, second, third] = splitPhoneNumber(field.value);
                return (
                  <View className="w-full flex-row items-center">
                    <View style={{ flex: 3, minWidth: 0 }}>
                      <TextInput
                        value={first}
                        onChangeText={(text) =>
                          field.onChange(mergePhoneNumber(text, second, third))
                        }
                        keyboardType="number-pad"
                        maxLength={3}
                        placeholder="090"
                        placeholderTextColor="#94a3b8"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-base text-slate-900"
                      />
                    </View>
                    <Text className="px-1.5 text-slate-400">-</Text>
                    <View style={{ flex: 4, minWidth: 0 }}>
                      <TextInput
                        value={second}
                        onChangeText={(text) =>
                          field.onChange(mergePhoneNumber(first, text, third))
                        }
                        keyboardType="number-pad"
                        maxLength={4}
                        placeholder="1234"
                        placeholderTextColor="#94a3b8"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-base text-slate-900"
                      />
                    </View>
                    <Text className="px-1.5 text-slate-400">-</Text>
                    <View style={{ flex: 4, minWidth: 0 }}>
                      <TextInput
                        value={third}
                        onChangeText={(text) =>
                          field.onChange(mergePhoneNumber(first, second, text))
                        }
                        keyboardType="number-pad"
                        maxLength={4}
                        placeholder="5678"
                        placeholderTextColor="#94a3b8"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-base text-slate-900"
                      />
                    </View>
                  </View>
                );
              }}
            />
            <ErrorText message={formState.errors.phone_number?.message} />

            <View className="mt-4">
              <FieldLabel label="郵便番号" />
              <Controller
                control={control}
                name="postal_code"
                render={({ field }) => {
                  const [first, second] = splitPostalCode(field.value);
                  return (
                    <View className="w-full flex-row items-center">
                      <View className="flex-row items-center" style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flex: 3, minWidth: 0 }}>
                          <TextInput
                            value={first}
                            onChangeText={(text) =>
                              field.onChange(mergePostalCode(text, second))
                            }
                            keyboardType="number-pad"
                            maxLength={3}
                            placeholder="150"
                            placeholderTextColor="#94a3b8"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-base text-slate-900"
                          />
                        </View>
                        <Text className="px-1.5 text-slate-400">-</Text>
                        <View style={{ flex: 4, minWidth: 0 }}>
                          <TextInput
                            value={second}
                            onChangeText={(text) =>
                              field.onChange(mergePostalCode(first, text))
                            }
                            keyboardType="number-pad"
                            maxLength={4}
                            placeholder="0001"
                            placeholderTextColor="#94a3b8"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-base text-slate-900"
                          />
                        </View>
                      </View>
                      <Pressable
                        onPress={onPressPostalSearch}
                        disabled={postalSearchLoading}
                        style={{ marginLeft: 8, minWidth: 64 }}
                        className={`h-12 items-center justify-center rounded-2xl px-4 ${
                          postalSearchLoading ? "bg-slate-300" : "bg-blue-600"
                        }`}
                      >
                        <Text className="text-sm font-semibold text-white">
                          {postalSearchLoading ? "検索中" : "検索"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                }}
              />
              <ErrorText message={formState.errors.postal_code?.message} />
              <Text className="mt-1 text-xs text-slate-500">
                郵便番号を入力して「検索」を押すと住所A/Bを自動入力します。
              </Text>
            </View>

            <View className="mt-4">
              <FieldLabel label="住所A" />
              <Controller
                control={control}
                name="address_1"
                render={({ field }) => (
                  <FormInput
                    value={field.value ?? ""}
                    onChangeText={field.onChange}
                    placeholder="例: 東京都渋谷区"
                  />
                )}
              />
              <ErrorText message={formState.errors.address_1?.message} />
            </View>

            <View className="mt-4">
              <FieldLabel label="住所B" />
              <Controller
                control={control}
                name="address_2"
                render={({ field }) => (
                  <FormInput
                    value={field.value ?? ""}
                    onChangeText={field.onChange}
                    placeholder="例: 1-2-3 メンバーズビル 101"
                  />
                )}
              />
              <ErrorText message={formState.errors.address_2?.message} />
            </View>
            </SectionCard>

            <SectionCard title="保険・雇用・暮らし">
            <FieldLabel label="保険証" />
            <Controller
              control={control}
              name="insurance_type"
              render={({ field }) => (
                <SegmentedControl
                  options={insuranceOptions}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
            <ErrorText message={formState.errors.insurance_type?.message} />

            <View className="mt-4">
              <FieldLabel label="雇用形態" />
              <Controller
                control={control}
                name="employment_status"
                render={({ field }) => (
                  <SegmentedControl
                    options={employmentOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              <ErrorText message={formState.errors.employment_status?.message} />
            </View>

            <View className="mt-4">
              <FieldLabel label="暮らし" />
              <Controller
                control={control}
                name="living_status"
                render={({ field }) => (
                  <SegmentedControl
                    options={livingOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              <ErrorText message={formState.errors.living_status?.message} />
            </View>
            </SectionCard>

            <SectionCard title="健康">
            <Controller
              control={control}
              name="hospital_visit_history"
              render={({ field }) => (
                <BooleanField
                  label="通院歴"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <ErrorText message={formState.errors.hospital_visit_history?.message} />

            <View className="mt-4">
              <FieldLabel label="障害者手帳" />
              <Controller
                control={control}
                name="disability_handbook"
                render={({ field }) => (
                  <SegmentedControl
                    options={disabilityOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              <ErrorText message={formState.errors.disability_handbook?.message} />
            </View>

            <View className="mt-4">
              <FieldLabel label="症状" />
              <Controller
                control={control}
                name="symptoms"
                render={({ field }) => (
                  <FormInput
                    value={field.value ?? ""}
                    onChangeText={field.onChange}
                    placeholder="例: 不眠、頭痛など"
                    multiline
                  />
                )}
              />
              <ErrorText message={formState.errors.symptoms?.message} />
            </View>

            <View className="mt-4">
              <FieldLabel label="病院名" />
              <Controller
                control={control}
                name="hospital_name"
                render={({ field }) => (
                  <FormInput
                    value={field.value ?? ""}
                    onChangeText={field.onChange}
                    placeholder="例: 〇〇メンタルクリニック"
                  />
                )}
              />
              <ErrorText message={formState.errors.hospital_name?.message} />
            </View>
            </SectionCard>

            <SectionCard title="仕事・家族">
            <FieldLabel label="職業" />
            <Controller
              control={control}
              name="occupation"
              render={({ field }) => (
                <FormInput
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="例: 事務職"
                />
              )}
            />
            <ErrorText message={formState.errors.occupation?.message} />

            <View className="mt-4">
              <FieldLabel label="職場" />
              <Controller
                control={control}
                name="workplace"
                render={({ field }) => (
                  <FormInput
                    value={field.value ?? ""}
                    onChangeText={field.onChange}
                    placeholder="例: 株式会社メンバーズ"
                  />
                )}
              />
              <ErrorText message={formState.errors.workplace?.message} />
            </View>

            <View className="mt-4">
              <FieldLabel label="既婚 / 未婚" />
              <Controller
                control={control}
                name="marital_status"
                render={({ field }) => (
                  <SegmentedControl
                    options={maritalOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              <ErrorText message={formState.errors.marital_status?.message} />
            </View>

            <View className="mt-4">
              <FieldLabel label="昨年度年収" />
              <Controller
                control={control}
                name="annual_income"
                render={({ field }) => (
                  <FormInput
                    value={field.value === undefined ? "" : String(field.value)}
                    onChangeText={(text) => field.onChange(toOptionalNumber(text))}
                    keyboardType="numeric"
                    placeholder="例: 3500000"
                  />
                )}
              />
              <ErrorText message={formState.errors.annual_income?.message} />
            </View>

            <View className="mt-4">
              <Controller
                control={control}
                name="is_on_welfare"
                render={({ field }) => (
                  <BooleanField
                    label="生活保護"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <ErrorText message={formState.errors.is_on_welfare?.message} />
            </View>

            <View className="mt-4">
              <Controller
                control={control}
                name="past_welfare_usage"
                render={({ field }) => (
                  <BooleanField
                    label="過去の福祉利用"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <ErrorText message={formState.errors.past_welfare_usage?.message} />
            </View>
            </SectionCard>

            <SectionCard title="経緯・関わり">
            <FieldLabel label="経緯" />
            <Controller
              control={control}
              name="background"
              render={({ field }) => (
                <FormInput
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="経緯を入力"
                  multiline
                />
              )}
            />
            <ErrorText message={formState.errors.background?.message} />

            <View className="mt-4">
              <FieldLabel label="関わり" />
              <Controller
                control={control}
                name="involvement"
                render={({ field }) => (
                  <FormInput
                    value={field.value ?? ""}
                    onChangeText={field.onChange}
                    placeholder="関わりを入力"
                    multiline
                  />
                )}
              />
              <ErrorText message={formState.errors.involvement?.message} />
            </View>
            </SectionCard>
            <View className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
              <Pressable
                onPress={() => setAgreedPrivacy((prev) => !prev)}
                className="flex-row items-center"
              >
                <View
                  className={`mr-3 h-5 w-5 items-center justify-center rounded border ${
                    agreedPrivacy
                      ? "border-blue-600 bg-blue-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <Text className="text-xs text-white">{agreedPrivacy ? "✓" : ""}</Text>
                </View>
                <Text className="flex-1 text-sm text-slate-700">
                  個人情報の取り扱いに同意します。
                </Text>
              </Pressable>
            </View>
            <Pressable
              onPress={onPressConfirm}
              disabled={!canMoveToConfirm}
              className={`mb-5 rounded-2xl px-4 py-4 ${
                canMoveToConfirm ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <Text className="text-center text-base font-semibold text-white">
                確認
              </Text>
            </Pressable>
              </>
            )}
            {isConfirming ? (
              <View className="mb-5 flex-row items-center gap-2">
                <Pressable
                  onPress={() => setIsConfirming(false)}
                  disabled={loading}
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-4"
                >
                  <Text className="text-center text-base font-semibold text-slate-700">
                    戻る
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit(onSubmit)}
                  disabled={loading}
                  className={`flex-1 rounded-2xl px-4 py-4 ${
                    loading ? "bg-slate-300" : "bg-blue-600"
                  }`}
                >
                  <Text className="text-center text-base font-semibold text-white">
                    {loading ? "送信中..." : "確定して保存"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateMemberScreen;
