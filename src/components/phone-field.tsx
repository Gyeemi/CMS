import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  COUNTRY_DIAL_CODES,
  countrySelectLabel,
  findCountryByIso2,
  type CountryDialInfo,
} from '@/constants/country-codes';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  composePhoneNumber,
  formatLocalPhoneDigits,
  parsePhoneNumber,
} from '@/lib/phone-format';

type PhoneFieldProps = {
  label: string;
  value: string;
  onChangeValue: (value: string) => void;
  editable?: boolean;
  hint?: string;
  textInputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'editable' | 'keyboardType'>;
};

export function PhoneField({
  label,
  value,
  onChangeValue,
  editable = true,
  hint,
  textInputProps,
}: PhoneFieldProps) {
  const theme = useTheme();
  const isDisabled = editable === false;
  const parsed = useMemo(() => parsePhoneNumber(value), [value]);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const handleCountryChange = (country: CountryDialInfo) => {
    onChangeValue(composePhoneNumber(country, parsed.localDigits));
    setCountryPickerOpen(false);
  };

  const handleLocalChange = (localInput: string) => {
    const localDigits = localInput.replace(/\D/g, '').slice(0, parsed.country.localMax);
    onChangeValue(composePhoneNumber(parsed.country, localDigits));
  };

  const localDisplay = formatLocalPhoneDigits(parsed.country, parsed.localDigits);

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View
        style={[
          styles.fieldRow,
          {
            borderColor: theme.border,
            backgroundColor: isDisabled ? theme.backgroundSelected : theme.backgroundInput,
            opacity: isDisabled ? 0.7 : 1,
          },
        ]}>
        <Pressable
          onPress={() => {
            if (!isDisabled) setCountryPickerOpen(true);
          }}
          disabled={isDisabled}
          style={styles.dialCodeSection}
          accessibilityRole="button"
          accessibilityLabel={`Select country code, currently +${parsed.country.dialCode}`}>
          <ThemedText type="smallBold" style={{ color: theme.text }}>
            +{parsed.country.dialCode}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.dialCodeChevron}>
            ▾
          </ThemedText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <TextInput
          value={localDisplay}
          onChangeText={handleLocalChange}
          placeholder={parsed.country.placeholder}
          placeholderTextColor={theme.textSecondary}
          editable={editable}
          keyboardType="phone-pad"
          style={[styles.localInput, { color: theme.text }]}
          {...textInputProps}
        />
      </View>

      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}

      <Modal
        visible={countryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setCountryPickerOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
            onPress={(event) => event.stopPropagation()}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              Select country code
            </ThemedText>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {COUNTRY_DIAL_CODES.map((country) => {
                const selected = country.iso2 === parsed.country.iso2;
                return (
                  <Pressable
                    key={country.iso2}
                    onPress={() => handleCountryChange(country)}
                    style={[
                      styles.sheetOption,
                      {
                        backgroundColor: selected ? theme.accent : theme.backgroundInput,
                        borderBottomColor: theme.border,
                      },
                    ]}>
                    <ThemedText type="small" style={{ color: selected ? '#FFFFFF' : theme.text }}>
                      {countrySelectLabel(country)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={[styles.sheetFooter, { borderTopColor: theme.border }]}>
              <Pressable
                onPress={() => setCountryPickerOpen(false)}
                style={[styles.cancelButton, { borderColor: theme.border }]}>
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 46,
  },
  dialCodeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
    minWidth: 72,
  },
  dialCodeChevron: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
  },
  localInput: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    fontFamily: FontFamily,
    backgroundColor: 'transparent',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    borderWidth: 1,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  sheetTitle: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  sheetList: {
    maxHeight: 360,
  },
  sheetOption: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetFooter: {
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
  },
});
