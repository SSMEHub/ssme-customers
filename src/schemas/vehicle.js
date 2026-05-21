import { z } from 'zod'

export const vehicleSchema = z
  .object({
    customer_id: z.string().uuid('Invalid customer').optional().or(z.literal('')),
    plate_number: z
      .string()
      .min(1, 'Plate number is required')
      .transform((v) => v.toUpperCase().replace(/\s/g, '')),
    chassis_no: z
      .string()
      .min(1, 'Chassis number is required')
      .transform((v) => v.toUpperCase()),
    engine_no: z
      .string()
      .min(1, 'Engine number is required')
      .transform((v) => v.toUpperCase()),
    maker: z.string().max(100).optional().or(z.literal('')),
    model_code: z.string().max(100).optional().or(z.literal('')),
    body_type: z.string().max(100).optional().or(z.literal('')),
    colour: z.string().max(50).optional().or(z.literal('')),
    gvw_kg: z.coerce.number().positive().optional().nullable(),
    kerb_weight_kg: z.coerce.number().positive().optional().nullable(),
    payload_kg: z.coerce.number().positive().optional().nullable(),
    engine_capacity: z.string().max(50).optional().or(z.literal('')),
    fuel_type: z.string().max(50).optional().or(z.literal('')),
    usage_class: z.string().max(100).optional().or(z.literal('')),
    assembly_type: z.enum(['CKD', 'CBU', '']).optional(),
    manufacture_yr: z.coerce.number().int().min(1990).max(2050).optional().nullable(),
    reg_date: z.string().optional().or(z.literal('')),
    delivery_date: z.string().optional().or(z.literal('')),
    completion_date: z.string().optional().or(z.literal('')),
    body_builder: z.string().max(200).optional().or(z.literal('')),
    sql_account_code: z.string().max(100).optional().or(z.literal('')),
    loan_bank: z.string().max(100).optional().or(z.literal('')),
    loan_tenure_months: z.coerce.number().int().positive().optional().nullable(),
    status: z
      .enum(['active', 'in_shop', 'decommissioned', 'scrapped'])
      .default('active'),
    notes: z.string().optional().or(z.literal('')),
  })
  .refine(
    (d) => {
      if (d.gvw_kg && d.kerb_weight_kg) return d.gvw_kg > d.kerb_weight_kg
      return true
    },
    { message: 'GVW must be greater than kerb weight', path: ['gvw_kg'] }
  )

export const vehicleDefaults = {
  customer_id: '',
  plate_number: '',
  chassis_no: '',
  engine_no: '',
  maker: '',
  model_code: '',
  body_type: '',
  colour: '',
  gvw_kg: '',
  kerb_weight_kg: '',
  payload_kg: '',
  engine_capacity: '',
  fuel_type: '',
  usage_class: '',
  assembly_type: '',
  manufacture_yr: '',
  reg_date: '',
  delivery_date: '',
  completion_date: '',
  body_builder: '',
  sql_account_code: '',
  loan_bank: '',
  loan_tenure_months: '',
  status: 'active',
  notes: '',
}
