// Caawiyeyaal taariikheed oo tixgeliya aagga waqtiga ganacsiga (tusaale Africa/Mogadishu).

function tzOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUTC - Math.floor(date.getTime() / 1000) * 1000;
}

// "YYYY-MM-DD" (maalin maxalli ah) -> waqtiga UTC ee maalintaasi bilaabato.
function startOfDayInTz(dateStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d));
  return new Date(guess.getTime() - tzOffsetMs(guess, timeZone));
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// Maalinta maanta ee aagga waqtiga, qaab "YYYY-MM-DD".
function todayInTz(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// {from, to} (labaduba waa la tiriyaa) -> { $gte, $lt } UTC
function rangeToUtc(from, to, timeZone) {
  const range = {};
  if (from) range.$gte = startOfDayInTz(from, timeZone);
  if (to) range.$lt = startOfDayInTz(addDays(to, 1), timeZone);
  return range;
}

module.exports = { tzOffsetMs, startOfDayInTz, addDays, todayInTz, rangeToUtc };
