import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

export default function VideoPlayer({ uri, style }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
    player.muted = false;
  });

  if (!uri) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>Vídeo indisponível</Text>
      </View>
    );
  }

  return (
    <VideoView
      player={player}
      style={style}
      nativeControls
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
  },
  fallbackText: {
    color: "#64748B",
    fontWeight: "700",
  },
});