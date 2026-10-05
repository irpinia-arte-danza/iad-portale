import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { AthleteCreateDialog } from "../../athletes/_components/athlete-create-dialog"
import { PaymentCreateDialog } from "../../payments/_components/payment-create-dialog"
import type {
  AthleteWithFormRelations,
  OpenScheduleOption,
} from "../../payments/queries"

// Le due cose che si fanno davvero più spesso, e che prima erano due link a
// una lista: qui si aprono subito, senza passare dalla pagina.
export function QuickActions({
  athletes,
  openSchedulesByAthlete,
}: {
  athletes: AthleteWithFormRelations[]
  openSchedulesByAthlete: Record<string, OpenScheduleOption[]>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Azioni rapide</CardTitle>
        <CardDescription>
          Si aprono qui: non serve andare in Pagamenti o in Allieve.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PaymentCreateDialog
            athletes={athletes}
            openSchedulesByAthlete={openSchedulesByAthlete}
          />
          <AthleteCreateDialog />
        </div>
      </CardContent>
    </Card>
  )
}
