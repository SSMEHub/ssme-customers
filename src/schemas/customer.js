import { z } from 'zod'

export const customerSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  entity_type: z.enum(
    ['Sdn Bhd', 'Enterprise', 'Individual', 'Cooperative', 'Gov Agency', 'Other'],
    { required_error: 'Entity type is required' }
  ),
  customer_code: z.string().max(50).optional().or(z.literal('')),
  id_number: z.string().max(100).optional().or(z.literal('')),
  id_type: z.enum(['SSM', 'IC', 'Other']).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_person: z.string().max(100).optional().or(z.literal('')),
  address_line1: z.string().max(200).optional().or(z.literal('')),
  address_line2: z.string().max(200).optional().or(z.literal('')),
  postcode: z.string().max(5).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).default('Kelantan'),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'rejected'], {
    required_error: 'Status is required',
  }),
})

export const customerDefaults = {
  company_name: '',
  entity_type: '',
  customer_code: '',
  id_number: '',
  id_type: '',
  phone: '',
  email: '',
  contact_person: '',
  address_line1: '',
  address_line2: '',
  postcode: '',
  city: '',
  state: 'Kelantan',
  notes: '',
  status: 'active',
}
