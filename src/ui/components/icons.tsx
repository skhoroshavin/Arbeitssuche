import {
  HomeIcon as HeroHomeIcon,
  ArrowLeftIcon as HeroArrowLeftIcon,
  Cog8ToothIcon,
  ChevronRightIcon as HeroChevronRightIcon,
} from "@heroicons/react/20/solid"
import type { ComponentProps } from "react"

export function HomeIcon({ className = defaultClass, ...p }: IconProperties) {
  return <HeroHomeIcon className={className} {...p} />
}

export function ArrowLeftIcon({
  className = defaultClass,
  ...p
}: IconProperties) {
  return <HeroArrowLeftIcon className={className} {...p} />
}

export function CogIcon({ className = defaultClass, ...p }: IconProperties) {
  return <Cog8ToothIcon className={className} {...p} />
}

export function ChevronRightIcon({
  className = defaultClass,
  ...p
}: IconProperties) {
  return <HeroChevronRightIcon className={className} {...p} />
}

type IconProperties = ComponentProps<"svg">
const defaultClass = "w-4 h-4"
