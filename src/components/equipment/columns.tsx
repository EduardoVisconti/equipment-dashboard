"use client"; //arquivo roda no client side/navegador e não no server - permite q tenha interação e hooks

import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction} from "@/components/ui/alert-dialog";
import { useDeleteEquipment } from "@/hooks/useEquipmentQueries";
import { ColumnDef } from "@tanstack/react-table";
import { Equipment } from "@/types/equipment";
import { format, differenceInDays } from "date-fns"; //biblioteca para manipulação de datas
import { Badge } from "@/components/ui/badge"; //componente visual para status, colorido
import Link from "next/link";

export const equipmentColumns: ColumnDef<Equipment>[] = [ //definição das colunas da tabela; q exibem dados do tipo Equipment
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "serialNumber",
    header: "Serial Number",
  },
  {
    accessorKey: "status",
    header: "Status",
    //função cell recebe um objeto (row) q representa uma linha da tabela -- usa apenas quando preciso renderizar algo customizado, como badges, datas, actions, etc
    cell: ({ row }) => { const status = row.getValue("status") as string; //dessa linha, pega o valor da coluna status

      return (
        <Badge variant = { status === "active" ? "default" : status === "maintenance" ? "secondary" : "destructive" }>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "purchaseDate", header: "Purchase Date",
    cell: ({ row }) => {
      const date = row.getValue("purchaseDate") as string;
      return format(new Date(date), "MM/dd/yyyy");
    },
  },
  {
    id: "lastService", header: "Last Service",
    cell: ({ row }) => {
      const lastServiceDate = row.original.lastServiceDate; // 
      const daysAgo = differenceInDays(new Date(), new Date(lastServiceDate + "T00:00:00"));

      return `${daysAgo} days ago`;
    },
  },

  //coluna com botões pra levar pra página/rotas de detalhes e edição
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const id = row.original.id;
      const deleteMutation = useDeleteEquipment();

      function handleDelete() {
        deleteMutation.mutate(id);
      }

      return (
        <div className="flex gap-2">
          <Link className="text-blue-600" href={`/equipment/${id}`}>
            View
          </Link>

          <Link className="text-green-600" href={`/equipment/${id}/edit`}>
            Edit
          </Link>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-red-600">Delete</button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete this equipment?
                </AlertDialogTitle>

                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  the equipment.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>

                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  }
];