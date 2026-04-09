/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useForm,
  useFieldArray,
  FieldValues,
  SubmitHandler,
  FormProvider,
} from "react-hook-form";
import MyFormInput from "@/components/form/MyFormInput";
import { useCreateEventMutation } from "@/redux/features/events/events.spi";
import { useAllUserQuery } from "@/redux/features/user/user.api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";

const btnPrimary = "px-4 py-2.5 rounded-xl text-sm font-semibold text-[#000000] transition-all duration-200 hover:opacity-90";
const btnPrimaryStyle = {
  background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
  fontFamily: 'Poppins, sans-serif',
};
const btnOutline = "px-4 py-2.5 rounded-xl text-sm font-medium border border-[#2A2A2A] text-[#B0B0B0] hover:text-[#FFFFFF] hover:border-[#3A3A3A] transition-all";
const btnDanger = "px-3 py-2 rounded-lg text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all";

const sectionTitle = (text: string) => (
  <h2
    className="text-2xl font-semibold text-[#FFFFFF] border-b border-[#2A2A2A] pb-3"
    style={{ fontFamily: 'Cormorant Garamond, serif' }}
  >
    {text}
  </h2>
);

const CreateEvent = () => {
  const router = useRouter();
  const [createEvent] = useCreateEventMutation();
  const { data: venuesData } = useAllUserQuery([
    { name: "role", value: "CLUB" },
    { name: "limit", value: 100 },
    { name: "page", value: "1" },
    { name: "status", value: "ACTIVE" },
  ]);
  const venues = venuesData?.data?.data ?? [];

  const methods = useForm({
    defaultValues: {
      venueId: "",
      eventName: "",
      descriptions: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      lastRegDate: "",
      lastRegTime: "",
      arriveDate: "",
      arriveTime: "",
      additionalGuests: 0,
      extraRequirements: "",
      eventImages: null,
      tableImages: null,
      maleAdmission: 0,
      femaleAdmission: 0,
      ticketLimitation: 0,
      ticketCharges: [{ feeName: "", feeAmount: 0 }],
      tables: [
        {
          tableName: "",
          tableDetails: "",
          maxAdditionGuest: 0,
          minimumSpentAmount: 0,
          isIncludedFoodBeverage: "false",
          tableCharges: [{ feeName: "", feeAmount: 0 }],
        },
      ],
    },
  });

  const { control, handleSubmit, formState: { errors }, setError } = methods;

  const { fields: ticketFields, append: appendTicket, remove: removeTicket } =
    useFieldArray({ control, name: "ticketCharges" });

  const { fields: tableFields, append: appendTable, remove: removeTable } =
    useFieldArray({ control, name: "tables" });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    const toastId = toast.loading("Creating event...");

    if (!data.eventImages || data.eventImages.length === 0) {
      setError("eventImages", { message: "Please upload at least one event image" });
      toast.error("Event image required", { id: toastId });
      return;
    }
    if (!data.tableImages || data.tableImages.length === 0) {
      setError("tableImages", { message: "Please upload at least one table image" });
      toast.error("Table image required", { id: toastId });
      return;
    }

    const formData = new FormData();

    const eventData = {
      venueId: data.venueId,
      eventName: data.eventName,
      descriptions: data.descriptions,
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime,
      lastRegDate: data.lastRegDate,
      lastRegTime: data.lastRegTime,
      arriveDate: data.arriveDate,
      arriveTime: data.arriveTime,
      additionalGuests: Number(data.additionalGuests),
      extraRequirements: data.extraRequirements,
      maleAdmission: Number(data.maleAdmission),
      femaleAdmission: Number(data.femaleAdmission),
      ticketLimitation: Number(data.ticketLimitation),
    };
    formData.append("eventData", JSON.stringify(eventData));

    Array.from(data.eventImages).forEach((file: any) => {
      formData.append("eventImages", file);
    });

    const ticketData = {
      maleAdmission: Number(data.maleAdmission),
      femaleAdmission: Number(data.femaleAdmission),
      ticketLimitation: Number(data.ticketLimitation),
      ticketCharges: data.ticketCharges.map((c: any) => ({
        feeName: c.feeName,
        feeAmount: c.feeAmount,
      })),
    };
    formData.append("ticketData", JSON.stringify(ticketData));

    const tableData = data.tables.map((t: any) => ({
      tableName: t.tableName,
      tableDetails: t.tableDetails,
      maxAdditionGuest: Number(t.maxAdditionGuest),
      minimumSpentAmount: Number(t.minimumSpentAmount),
      isIncludedFoodBeverage: t.isIncludedFoodBeverage === "true",
      tableCharges: t.tableCharges.map((c: any) => ({
        feeName: c.feeName,
        feeAmount: c.feeAmount,
      })),
    }));
    formData.append("tableData", JSON.stringify(tableData));

    Array.from(data.tableImages).forEach((file: any) => {
      formData.append("tableImages", file);
    });

    try {
      await createEvent(formData).unwrap();
      toast.success("Event created!", { id: toastId });
      router.push("/club");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create event", { id: toastId });
    }
  };

  return (
    <div className="bg-[#000000] min-h-screen py-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#000000] p-8">
          <h1
            className="text-3xl font-semibold text-[#FFFFFF] mb-8 text-center"
            style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.05em' }}
          >
            Create New Event
          </h1>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
              {/* Basic Info */}
              {sectionTitle("Event Details")}
              <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label
                    className="block text-xs text-[#888899] uppercase tracking-wider mb-2"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    Venue <span className="text-red-400">*</span>
                  </label>
                  <select
                    {...methods.register("venueId")}
                    className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-xl px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#D4A574] transition-colors appearance-none"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    <option value="">Select venue...</option>
                    {venues.map((venue: any) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <MyFormInput name="eventName" label="Event Name" />
                <MyFormInput name="additionalGuests" label="Additional Guests" type="number" />
                <MyFormInput name="startDate" label="Start Date" type="date" />
                <MyFormInput name="endDate" label="End Date" type="date" />
                <MyFormInput name="startTime" label="Start Time" type="time" />
                <MyFormInput name="endTime" label="End Time" type="time" />
                <MyFormInput name="lastRegDate" label="Last Registration Date" type="date" />
                <MyFormInput name="lastRegTime" label="Last Registration Time" type="time" />
                <MyFormInput name="arriveDate" label="Arrival Date" type="date" />
                <MyFormInput name="arriveTime" label="Arrival Time" type="time" />
                <MyFormInput name="descriptions" label="Description" type="textarea" />
                <MyFormInput name="extraRequirements" label="Extra Requirements" type="textarea" />
              </div>

              {/* Event Images */}
              <div>
                {sectionTitle("Event Images")}
                <div className="mt-5">
                  <MyFormInput name="eventImages" type="file" label="Upload Event Images" isMultiple />
                  {errors.eventImages && (
                    <p className="text-red-400 text-xs mt-1"
                      style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {errors.eventImages.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Ticket Info */}
              {sectionTitle("Ticket Information")}
              <div className="grid md:grid-cols-3 gap-5">
                <MyFormInput name="maleAdmission" label="Male Admission ($)" type="number" />
                <MyFormInput name="femaleAdmission" label="Female Admission ($)" type="number" />
                <MyFormInput name="ticketLimitation" label="Ticket Limit" type="number" />
              </div>

              <div>
                <p className="text-xs text-[#B0B0B0] uppercase tracking-widest mb-4"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Ticket Charges
                </p>
                <div className="space-y-3">
                  {ticketFields.map((field, idx) => (
                    <div key={field.id} className="grid md:grid-cols-3 gap-4 items-end">
                      <MyFormInput name={`ticketCharges.${idx}.feeName`} label="Fee Name" />
                      <MyFormInput name={`ticketCharges.${idx}.feeAmount`} label="Amount ($)" type="number" />
                      {ticketFields.length > 1 && (
                        <button type="button" className={btnDanger} onClick={() => removeTicket(idx)}>
                          <Trash2 size={14} className="inline mr-1" />Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={`${btnOutline} mt-3 flex items-center gap-1.5`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                  onClick={() => appendTicket({ feeName: "", feeAmount: 0 })}
                >
                  <Plus size={14} />Add Ticket Charge
                </button>
              </div>

              {/* Table Info */}
              {sectionTitle("Table Information")}
              <div className="space-y-6">
                {tableFields.map((table, tIdx) => (
                  <div key={table.id} className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-5">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-[#C4707E]"
                        style={{ fontFamily: 'Poppins, sans-serif' }}>
                        Table {tIdx + 1}
                      </p>
                      {tableFields.length > 0 && (
                        <button type="button" className={btnDanger} onClick={() => removeTable(tIdx)}>
                          <Trash2 size={14} className="inline mr-1" />Remove
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <MyFormInput name={`tables.${tIdx}.tableName`} label="Table Name" />
                      <MyFormInput name={`tables.${tIdx}.maxAdditionGuest`} label="Max Guests" type="number" />
                      <MyFormInput name={`tables.${tIdx}.minimumSpentAmount`} label="Minimum Spend ($)" type="number" />
                      <MyFormInput name={`tables.${tIdx}.isIncludedFoodBeverage`} label="Includes F&B (true/false)" placeholder="true / false" />
                      <MyFormInput name={`tables.${tIdx}.tableDetails`} type="textarea" label="Table Details" />
                    </div>

                    <div>
                      <p className="text-xs text-[#B0B0B0] uppercase tracking-widest mb-3"
                        style={{ fontFamily: 'Poppins, sans-serif' }}>
                        Table Charges
                      </p>
                      <TableCharges index={tIdx} control={control} />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className={`${btnOutline} flex items-center gap-1.5`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                  onClick={() =>
                    appendTable({
                      tableName: "",
                      tableDetails: "",
                      maxAdditionGuest: 0,
                      minimumSpentAmount: 0,
                      isIncludedFoodBeverage: "false",
                      tableCharges: [{ feeName: "", feeAmount: 0 }],
                    })
                  }
                >
                  <Plus size={14} />Add New Table
                </button>
              </div>

              {/* Table Images */}
              <div>
                {sectionTitle("Table Images")}
                <div className="mt-5">
                  <MyFormInput name="tableImages" type="file" label="Upload Table Images" isMultiple />
                  {errors.tableImages && (
                    <p className="text-red-400 text-xs mt-1"
                      style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {errors.tableImages.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={`${btnPrimary} w-full py-4 text-base`}
                style={btnPrimaryStyle}
              >
                Create Event
              </button>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;

const TableCharges = ({ index, control }: { index: number; control: any }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `tables.${index}.tableCharges`,
  });

  return (
    <div className="space-y-3">
      {fields.map((charge, idx) => (
        <div key={charge.id} className="grid md:grid-cols-3 gap-4 items-end">
          <MyFormInput name={`tables.${index}.tableCharges.${idx}.feeName`} label="Fee Name" />
          <MyFormInput name={`tables.${index}.tableCharges.${idx}.feeAmount`} label="Amount ($)" type="number" />
          {fields.length > 1 && (
            <button
              type="button"
              className="px-3 py-2 rounded-lg text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
              style={{ fontFamily: 'Poppins, sans-serif' }}
              onClick={() => remove(idx)}
            >
              <Trash2 size={14} className="inline mr-1" />Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="px-4 py-2.5 rounded-xl text-sm font-medium border border-[#2A2A2A] text-[#B0B0B0] hover:text-[#FFFFFF] hover:border-[#3A3A3A] transition-all flex items-center gap-1.5 mt-2"
        style={{ fontFamily: 'Poppins, sans-serif' }}
        onClick={() => append({ feeName: "", feeAmount: 0 })}
      >
        <Plus size={14} />Add Charge
      </button>
    </div>
  );
};
