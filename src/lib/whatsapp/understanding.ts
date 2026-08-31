import { extractParcelQuery } from './extractParcelQuery'
import type { ConvFields, ParsedQuery } from './types'

export interface QueryUnderstanding {
  understand(text: string, prior: ConvFields): Promise<ParsedQuery>
}

export const ruleBasedUnderstanding: QueryUnderstanding = {
  async understand(text: string, _prior: ConvFields): Promise<ParsedQuery> {
    return extractParcelQuery(text)
  },
}
