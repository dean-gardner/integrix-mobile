import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  type BillingCycle,
  getCurrentPlanKey,
  getPlanFeatures,
  subscriptionPlans,
  supportEmail,
} from '../config/subscriptionScreen';
import type { AppDispatch, RootState } from '../store';
import { createSubscriptionEntry, fetchSubscriptionMemberPrices, fetchUserSubscription } from '../store/subscriptionSlice';
import { theme } from '../theme';

export default function SubscriptionScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const scrollRef = useRef<ScrollView>(null);
  const user = useSelector((s: RootState) => s.auth.user);
  const { subscription, memberPrices, isLoading, isActionLoading, error } = useSelector(
    (s: RootState) => s.subscription
  );

  const [refreshing, setRefreshing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [contactInfoVisible, setContactInfoVisible] = useState(false);
  const currentPlan = useMemo(() => getCurrentPlanKey(subscription), [subscription]);

  useEffect(() => {
    dispatch(fetchSubscriptionMemberPrices());
    if (user?.id) {
      dispatch(fetchUserSubscription(user.id));
    }
  }, [dispatch, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    const tasks: Promise<unknown>[] = [dispatch(fetchSubscriptionMemberPrices()).unwrap().catch(() => {})];
    if (user?.id) {
      tasks.push(dispatch(fetchUserSubscription(user.id)).unwrap().catch(() => {}));
    }
    await Promise.all(tasks);
    setRefreshing(false);
  };

  const openContactUs = async () => {
    const mailUrl = `mailto:${supportEmail}`;
    try {
      const canOpen = await Linking.canOpenURL(mailUrl);
      if (canOpen) {
        await Linking.openURL(mailUrl);
        return;
      }
    } catch {
      /* No mail client or open failed — show support details like web */
    }
    setContactInfoVisible(true);
  };

  const handlePlanPress = async (tariffPlan: number | null) => {
    if (tariffPlan == null) return;
    if (!user?.id) {
      Alert.alert('Subscription', 'Sign in to change subscription.');
      return;
    }

    try {
      const paymentLink = await dispatch(
        createSubscriptionEntry({
          ownerUserId: user.id,
          tariffPlan,
          billingCycle,
        })
      ).unwrap();

      if (paymentLink && /^https?:\/\//i.test(paymentLink)) {
        const canOpen = await Linking.canOpenURL(paymentLink);
        if (canOpen) {
          await Linking.openURL(paymentLink);
        }
      }

      await dispatch(fetchUserSubscription(user.id)).unwrap();
    } catch (e) {
      Alert.alert('Subscription', (e as string) || 'Failed to update subscription.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Subscription</Text>

        <View style={styles.mainCard}>
          <Text style={styles.chooseTitle}>Choose the subscription</Text>

          <View style={styles.billingCycleRow}>
            <TouchableOpacity
              style={styles.billingOption}
              onPress={() => setBillingCycle('monthly')}
              disabled={isActionLoading}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={billingCycle === 'monthly' ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={18}
                color={billingCycle === 'monthly' ? '#4aa14b' : '#9fa5b3'}
              />
              <Text style={styles.billingOptionText}>Monthly</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.billingOption}
              onPress={() => setBillingCycle('annual')}
              disabled={isActionLoading}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={billingCycle === 'annual' ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={18}
                color={billingCycle === 'annual' ? '#4aa14b' : '#9fa5b3'}
              />
              <Text style={styles.billingOptionText}>
                Annually <Text style={styles.saveText}>(Save 10%)</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {isLoading && !memberPrices ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null}

          <View style={styles.planCardsWrap}>
            {subscriptionPlans.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              const features = getPlanFeatures(plan.key, billingCycle, memberPrices);
              const buttonText = isCurrent ? 'CURRENT' : plan.actionText;
              const isEnterprise = plan.key === 'enterprise';

              return (
                <View key={plan.key} style={[styles.planCard, isCurrent && styles.planCardCurrent]}>
                  {isCurrent ? (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>CURRENT</Text>
                    </View>
                  ) : null}

                  <View style={styles.planTitleBox}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                  </View>

                  <View style={styles.planBody}>
                    {features.map((feature) => (
                      <Text key={`${plan.key}-${feature.label}`} style={styles.featureLine}>
                        <Text style={styles.featureLabel}>{feature.label}:</Text> {feature.value}
                      </Text>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.planButton,
                      isCurrent ? styles.planButtonCurrent : styles.planButtonAction,
                      isActionLoading && styles.buttonDisabled,
                    ]}
                    onPress={() => {
                      if (isCurrent || isActionLoading) return;
                      if (isEnterprise) {
                        openContactUs().catch(() => {});
                        return;
                      }
                      handlePlanPress(plan.tariffPlan).catch(() => {});
                    }}
                    disabled={isCurrent || isActionLoading}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.planButtonText,
                        isCurrent ? styles.planButtonTextCurrent : styles.planButtonTextAction,
                      ]}
                    >
                      {buttonText}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.backToTopButton}
        onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        activeOpacity={0.8}
      >
        <MaterialIcons name="keyboard-double-arrow-up" size={30} color="#ffffff" />
      </TouchableOpacity>

      <Modal
        visible={contactInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactInfoVisible(false)}
      >
        <View style={styles.contactModalBackdrop}>
          <View style={styles.contactModalCard}>
            <View style={styles.contactModalHeader}>
              <Text style={styles.contactModalTitle}>Info</Text>
              <TouchableOpacity
                onPress={() => setContactInfoVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialIcons name="close" size={24} color="#2f3444" />
              </TouchableOpacity>
            </View>
            <Text style={styles.contactModalBody}>
              Please contact{' '}
              <Text
                style={styles.contactModalEmail}
                onPress={() => Linking.openURL(`mailto:${supportEmail}`).catch(() => {})}
              >
                {supportEmail}
              </Text>
            </Text>
            <TouchableOpacity
              style={styles.contactModalCloseBtn}
              onPress={() => setContactInfoVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.contactModalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 86,
  },
  pageTitle: {
    fontSize: 35,
    fontWeight: '700',
    color: '#1e2738',
    marginBottom: 12,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8deec',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 12,
  },
  chooseTitle: {
    textAlign: 'center',
    color: '#252a33',
    fontSize: 41,
    fontWeight: '700',
    marginBottom: 10,
  },
  billingCycleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  billingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billingOptionText: {
    fontSize: 15,
    color: '#17191f',
  },
  saveText: {
    color: '#17191f',
  },
  errorBox: {
    backgroundColor: '#fee',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
  },
  loadingWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  planCardsWrap: {
    gap: 12,
  },
  planCard: {
    borderWidth: 1,
    borderColor: '#d8dde7',
    borderRadius: 5,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 340,
  },
  planCardCurrent: {
    borderColor: '#7d8cd2',
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    right: 20,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6673c2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  currentBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  planTitleBox: {
    marginTop: 2,
    minHeight: 34,
    borderRadius: 6,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    color: '#252a33',
    fontSize: 37,
    fontWeight: '700',
  },
  planBody: {
    flex: 1,
    paddingTop: 10,
    gap: 6,
  },
  featureLine: {
    color: '#252a33',
    fontSize: 16,
    lineHeight: 23,
  },
  featureLabel: {
    fontWeight: '700',
  },
  planButton: {
    minHeight: 44,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  planButtonAction: {
    borderColor: '#1f39b1',
    backgroundColor: '#ffffff',
  },
  planButtonCurrent: {
    borderColor: '#98a4da',
    backgroundColor: '#ffffff',
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  planButtonTextAction: {
    color: '#1f39b1',
  },
  planButtonTextCurrent: {
    color: '#95a1d9',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  backToTopButton: {
    position: 'absolute',
    right: 10,
    bottom: 20,
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#243aa8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  contactModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  contactModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  contactModalTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: theme.colors.text,
  },
  contactModalBody: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2a2f3d',
    marginBottom: 20,
  },
  contactModalEmail: {
    color: theme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  contactModalCloseBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactModalCloseBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
