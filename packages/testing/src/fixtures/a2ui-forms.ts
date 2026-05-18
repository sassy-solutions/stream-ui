import type { FormSpec } from '@stream-ui/protocol';

/**
 * E-commerce checkout — mixed field types, conditional disable, required
 * billing address. Submit fires an agent tool.
 */
export const checkoutFormSpec: FormSpec = {
  id: 'checkout',
  title: 'Checkout',
  description: 'Confirm your order details to complete the purchase.',
  fields: [
    {
      name: 'email',
      kind: 'email',
      label: 'Email',
      placeholder: 'you@example.com',
      constraints: { required: true, maxLength: 200 },
    },
    {
      name: 'fullName',
      kind: 'text',
      label: 'Full name',
      constraints: { required: true, minLength: 2, maxLength: 80 },
    },
    {
      name: 'addressLine1',
      kind: 'text',
      label: 'Address',
      constraints: { required: true, maxLength: 200 },
    },
    {
      name: 'addressLine2',
      kind: 'text',
      label: 'Address line 2',
    },
    {
      name: 'country',
      kind: 'select',
      label: 'Country',
      constraints: { required: true },
      options: [
        { label: 'France', value: 'FR' },
        { label: 'United States', value: 'US' },
        { label: 'United Kingdom', value: 'GB' },
        { label: 'Germany', value: 'DE' },
      ],
    },
    {
      name: 'shippingMethod',
      kind: 'radio',
      label: 'Shipping method',
      constraints: { required: true },
      defaultValue: 'standard',
      options: [
        { label: 'Standard (5-7 days)', value: 'standard' },
        { label: 'Express (2-3 days)', value: 'express' },
        { label: 'Overnight', value: 'overnight' },
      ],
    },
    {
      name: 'giftWrap',
      kind: 'checkbox',
      label: 'Add gift wrapping (+$5)',
      defaultValue: false,
    },
    {
      name: 'orderNotes',
      kind: 'textarea',
      label: 'Order notes',
      placeholder: 'Anything we should know?',
      constraints: { maxLength: 500 },
    },
  ],
  submit: {
    target: 'tool:placeOrder',
    label: 'Place order',
    disableUntilValid: true,
    confirm: {
      title: 'Confirm order',
      message: 'Charge your card and place the order?',
      confirmLabel: 'Place order',
      cancelLabel: 'Review',
    },
  },
  secondaryActions: [{ target: 'event:cancelCheckout', label: 'Cancel' }],
};

/**
 * Lightweight contact-us form. Useful as the "happy path" fixture.
 */
export const contactFormSpec: FormSpec = {
  id: 'contact',
  title: 'Contact us',
  description: 'We typically reply within one business day.',
  fields: [
    {
      name: 'name',
      kind: 'text',
      label: 'Your name',
      constraints: { required: true, minLength: 2, maxLength: 80 },
    },
    {
      name: 'email',
      kind: 'email',
      label: 'Email',
      constraints: { required: true },
    },
    {
      name: 'topic',
      kind: 'select',
      label: 'Topic',
      constraints: { required: true },
      options: [
        { label: 'Sales', value: 'sales' },
        { label: 'Support', value: 'support' },
        { label: 'Partnerships', value: 'partnerships' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'message',
      kind: 'textarea',
      label: 'Message',
      constraints: { required: true, minLength: 10, maxLength: 2000 },
    },
    {
      name: 'subscribe',
      kind: 'checkbox',
      label: 'Subscribe to product updates',
      defaultValue: false,
    },
  ],
  submit: {
    target: 'http:POST /api/contact',
    label: 'Send message',
  },
};

/**
 * Account signup — exercises password rules, hidden marketing flag,
 * multiselect interests.
 */
export const signupFormSpec: FormSpec = {
  id: 'signup',
  title: 'Create your account',
  fields: [
    {
      name: 'email',
      kind: 'email',
      label: 'Email',
      constraints: { required: true, maxLength: 200 },
    },
    {
      name: 'password',
      kind: 'password',
      label: 'Password',
      description: 'At least 12 characters, mixed case and a digit.',
      constraints: {
        required: true,
        minLength: 12,
        maxLength: 200,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{12,}$',
      },
    },
    {
      name: 'username',
      kind: 'text',
      label: 'Username',
      constraints: { required: true, minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_-]+$' },
    },
    {
      name: 'birthday',
      kind: 'date',
      label: 'Birthday',
      constraints: { required: true },
    },
    {
      name: 'interests',
      kind: 'multiselect',
      label: 'Interests',
      constraints: { minItems: 1, maxItems: 5 },
      options: [
        { label: 'Engineering', value: 'engineering' },
        { label: 'Design', value: 'design' },
        { label: 'Product', value: 'product' },
        { label: 'AI', value: 'ai' },
        { label: 'Operations', value: 'operations' },
        { label: 'Sales', value: 'sales' },
      ],
    },
    {
      name: 'avatar',
      kind: 'file',
      label: 'Avatar',
      constraints: { accept: ['image/png', 'image/jpeg'], maxItems: 1 },
    },
    {
      name: 'marketingOptIn',
      kind: 'checkbox',
      label: 'Email me product updates',
      defaultValue: true,
    },
    {
      name: 'referrer',
      kind: 'hidden',
      label: 'Referrer',
    },
    {
      name: 'tos',
      kind: 'checkbox',
      label: 'I agree to the Terms of Service',
      constraints: { required: true },
    },
  ],
  submit: {
    target: 'tool:createAccount',
    label: 'Create account',
    disableUntilValid: true,
  },
};

/**
 * Convenience map — useful for parameterised tests.
 */
export const a2uiFormFixtures = {
  checkout: checkoutFormSpec,
  contact: contactFormSpec,
  signup: signupFormSpec,
} as const;

export type A2uiFormFixtureName = keyof typeof a2uiFormFixtures;
