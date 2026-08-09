// يحسب الأيام/الساعات/الدقائق/الثواني المتبقية بشكل حقيقي حتى تاريخ الهدف
// (countdownDate). لو ما فيه تاريخ محدد أو التاريخ فات، يرجّع كلها أصفار.
export function getTimeLeft(targetIso?: string) {
  if (!targetIso) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const target = new Date(targetIso).getTime()
  if (Number.isNaN(target)) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const diff = Math.max(0, target - Date.now())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}
