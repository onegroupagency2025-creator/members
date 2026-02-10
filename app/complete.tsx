import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export default function CompleteScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 480;
  const onPressClose = () => {
    if (Platform.OS === "web") {
      window.close();
      window.location.href = "about:blank";
      return;
    }
    router.replace("/create");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View
        className="flex-1 items-center justify-center"
        style={{ paddingHorizontal: isNarrow ? 32 : 24 }}
      >
        <View
          className="w-full max-w-[420px] rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm"
        >
          <Text className="text-center text-2xl font-bold text-slate-900">
            保存完了
          </Text>
          <Text className="mt-3 text-center text-base leading-6 text-slate-600">
            無事に保存されました
          </Text>
          <Pressable
            onPress={onPressClose}
            className="mt-6 rounded-2xl bg-blue-600 px-4 py-4"
          >
            <Text className="text-center text-base font-semibold text-white">
              終了
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
