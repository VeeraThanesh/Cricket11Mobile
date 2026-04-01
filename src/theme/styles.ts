import { StyleSheet } from 'react-native';

export const Colors = {
  primary: '#1A6B3C',
  primaryDark: '#134D2C',
  primaryLight: '#2E9E5B',
  accent: '#F4B942',
  background: '#0D1B13',
  surface: '#162A1E',
  surfaceAlt: '#1E3A28',
  text: '#FFFFFF',
  textSecondary: '#A8C5B0',
  textMuted: '#6B8F78',
  error: '#E05252',
  success: '#4CAF50',
  warning: '#FF9800',
  border: '#2A4535',
  // Ball result colors
  dot: '#6B8F78',
  boundary4: '#2196F3',
  boundary6: '#9C27B0',
  wicket: '#E05252',
  wide: '#FF9800',
  noBall: '#FF5722',
};

export const Typography = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '700', color: Colors.text },
  h2: { fontSize: 22, fontWeight: '700', color: Colors.text },
  h3: { fontSize: 18, fontWeight: '600', color: Colors.text },
  body: { fontSize: 15, color: Colors.text },
  bodySmall: { fontSize: 13, color: Colors.textSecondary },
  label: { fontSize: 12, color: Colors.textMuted, letterSpacing: 0.5 },
  score: { fontSize: 42, fontWeight: '800', color: Colors.accent },
});

export const GlobalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    marginVertical: 6,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonOutlineText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
});
