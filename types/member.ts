import { z } from "zod";

import { memberFormSchema } from "../lib/schema/member";

export type MemberFormValues = z.infer<typeof memberFormSchema>;
