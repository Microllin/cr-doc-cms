import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { zh: '用户', en: 'User' },
    plural: { zh: '用户', en: 'Users' },
  },
  admin: {
    group: { zh: '系统', en: 'System' },
    useAsTitle: 'email',
    description: {
      zh: '可以登录后台的账号。',
      en: 'Accounts that can sign in to the admin panel.',
    },
  },
  auth: true,
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
