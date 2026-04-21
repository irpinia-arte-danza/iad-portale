import { Image, StyleSheet, Text, View } from "@react-pdf/renderer"

import { pdfColors } from "../styles"

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "column",
  },
  logoBox: {
    borderWidth: 1.5,
    borderColor: pdfColors.accent,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
  },
  logoText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: pdfColors.accent,
    letterSpacing: 2,
  },
  tagline: {
    marginTop: 3,
    fontSize: 8,
    color: pdfColors.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  logoImage: {
    width: 90,
    height: 36,
    objectFit: "contain",
  },
})

type IADHeaderMarkProps = {
  logoUrl?: string | null
}

export function IADHeaderMark({ logoUrl }: IADHeaderMarkProps = {}) {
  if (logoUrl) {
    return (
      <View style={styles.wrapper}>
        <Image src={logoUrl} style={styles.logoImage} />
      </View>
    )
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>IAD</Text>
      </View>
      <Text style={styles.tagline}>Irpinia Arte Danza</Text>
    </View>
  )
}
