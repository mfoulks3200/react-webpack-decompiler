"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, ButtonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { twMerge } from "tailwind-merge";
import { useState } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  variant?: ButtonVariants["variant"];
  triggerClassName?: string;
  options: ComboboxOption[];
  defaultOption?: string;
  placeholder?: string;
  canSearch?: boolean;
  onChange?: (id: string) => void;
}

export const Combobox = ({
  variant,
  triggerClassName,
  options,
  placeholder,
  defaultOption,
  canSearch,
  onChange,
}: ComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultOption);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={(variant ?? "outline")!}
          role="combobox"
          aria-expanded={open}
          className={twMerge("w-[200px] justify-between", triggerClassName)}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder ?? "Select option..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          {canSearch && (
            <CommandInput placeholder="Search..." className="h-9" />
          )}
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    onChange?.(currentValue);
                  }}
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
