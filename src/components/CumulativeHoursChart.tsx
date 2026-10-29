import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ActivityItem, ALL_GRADES, GradeLevel, GRADE_LABELS } from '../types';

interface CumulativeHoursChartProps {
  activities: ActivityItem[];
  currentGrade: GradeLevel;
}

interface GradeChartPoint {
  grade: GradeLevel;
  gradeLabel: string;
  shortLabel: string;
  era: string;
  annualHours: number;
  cumulativeHours: number;
  activeCount: number;
  starredHours: number;
  avgImpactScore: number;
  topActivities: string[];
}

export const CumulativeHoursChart: React.FC<CumulativeHoursChartProps> = ({
  activities,
  currentGrade,
}) => {
  const [showAnnualBars, setShowAnnualBars] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'starred'>('all');

  const chartData = useMemo<GradeChartPoint[]>(() => {
    const filtered =
      filterMode === 'starred'
        ? activities.filter(
            (a) => a.commonAppSlot >= 1 && a.commonAppSlot <= 10
          )
        : activities;

    let runningTotal = 0;

    return ALL_GRADES.map((grade) => {
      const activeInGrade = filtered.filter((act) =>
        act.grades.includes(grade)
      );

      const annualHours = activeInGrade.reduce((sum, act) => {
        const hrs =
          (Number(act.hoursPerWeek) || 0) * (Number(act.weeksPerYear) || 0);
        return sum + hrs;
      }, 0);

      const starredHours = activeInGrade
        .filter((act) => act.commonAppSlot >= 1 && act.commonAppSlot <= 10)
        .reduce((sum, act) => {
          const hrs =
            (Number(act.hoursPerWeek) || 0) * (Number(act.weeksPerYear) || 0);
          return sum + hrs;
        }, 0);

      const avgImpactScore =
        activeInGrade.length > 0
          ? Number(
              (
                activeInGrade.reduce(
                  (acc, a) => acc + (Number(a.impactScore) || 4),
                  0
                ) / activeInGrade.length
              ).toFixed(1)
            )
          : 0;

      runningTotal += annualHours;

      return {
        grade,
        gradeLabel: GRADE_LABELS[grade].title,
        shortLabel: `${grade}th Grade`,
        era: GRADE_LABELS[grade].era,
        annualHours: Math.round(annualHours),
        cumulativeHours: Math.round(runningTotal),
        activeCount: activeInGrade.length,
        starredHours: Math.round(starredHours),
        avgImpactScore,
        topActivities: activeInGrade
          .slice(0, 3)
          .map((a) => `${a.position} (${a.organization})`),
      };
    });
  }, [activities, filterMode]);

  const totalCumulativeHours =
    chartData[chartData.length - 1]?.cumulativeHours || 0;
  const currentGradeCumulative =
    chartData.find((d) => d.grade === currentGrade)?.cumulativeHours || 0;
  const peakGrade = useMemo(() => {
    return chartData.reduce(
      (best, cur) => (cur.annualHours > best.annualHours ? cur : best),
      chartData[0]
    );
  }, [chartData]);

  return (
    <div className="bg-white rounded-2xl border border-[#E6E1D8] shadow-xs p-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E6E1D8]">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#5A6478]">
            <TrendingUp className="w-4 h-4 text-[#14233C]" />
            <span>6th–12th Grade Activity Progression</span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-[#14233C] mt-1">
            Cumulative Extracurricular Hours
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-[#FAF8F4] border border-[#E6E1D8] p-1">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white text-[#14233C] shadow-2xs'
                  : 'text-[#5A6478] hover:text-[#14233C]'
              }`}
            >
              All Activities
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('starred')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                filterMode === 'starred'
                  ? 'bg-white text-[#14233C] shadow-2xs'
                  : 'text-[#5A6478] hover:text-[#14233C]'
              }`}
            >
              Top 10 Only
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAnnualBars((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showAnnualBars
                ? 'bg-[#14233C] border-[#14233C] text-white'
                : 'bg-white border-[#E6E1D8] text-[#5A6478] hover:bg-[#FAF8F4]'
            }`}
          >
            {showAnnualBars ? 'Hide Yearly Bars' : 'Show Yearly Bars'}
          </button>
        </div>
      </div>

      {/* Clean KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
        <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] px-4 py-3">
          <div className="text-xs font-medium text-[#5A6478]">
            Total Projected Hours (6th–12th)
          </div>
          <div className="text-xl font-semibold text-[#14233C] tabular-nums mt-0.5">
            {totalCumulativeHours.toLocaleString()} hrs
          </div>
        </div>

        <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] px-4 py-3">
          <div className="text-xs font-medium text-[#5A6478]">
            Logged Through {currentGrade}th Grade
          </div>
          <div className="text-xl font-semibold text-[#14233C] tabular-nums mt-0.5">
            {currentGradeCumulative.toLocaleString()} hrs
          </div>
        </div>

        <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E1D8] px-4 py-3">
          <div className="text-xs font-medium text-[#5A6478]">
            Peak Activity Year
          </div>
          <div className="text-xl font-semibold text-[#14233C] mt-0.5">
            {peakGrade && peakGrade.annualHours > 0
              ? `${peakGrade.shortLabel} (${peakGrade.annualHours}h)`
              : '—'}
          </div>
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="h-72 sm:h-80 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 16, right: 18, left: 0, bottom: 8 }}
          >
            <defs>
              <linearGradient
                id="cumulativeNavyFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#14233C" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#14233C" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E6E1D8"
            />

            <XAxis
              dataKey="shortLabel"
              tick={{ fill: '#5A6478', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: '#E6E1D8' }}
              tickLine={false}
              dy={6}
            />

            <YAxis
              tick={{ fill: '#5A6478', fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}h`}
              width={48}
            />

            <Tooltip
              cursor={{ stroke: '#B8913A', strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload as GradeChartPoint;
                return (
                  <div className="bg-white text-[#14233C] rounded-xl p-3.5 shadow-lg border border-[#E6E1D8] text-xs space-y-2 max-w-xs">
                    <div className="flex items-center justify-between gap-4 border-b border-[#E6E1D8] pb-1.5">
                      <span className="font-semibold text-[#14233C]">
                        {point.gradeLabel}
                      </span>
                      <span className="text-[#5A6478]">
                        {point.activeCount}{' '}
                        {point.activeCount === 1 ? 'activity' : 'activities'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[#5A6478]">Cumulative Hours:</span>
                        <span className="tabular-nums font-semibold text-[#14233C]">
                          {point.cumulativeHours.toLocaleString()} hrs
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[#5A6478]">Annual Hours:</span>
                        <span className="tabular-nums text-[#14233C]">
                          +{point.annualHours.toLocaleString()} hrs
                        </span>
                      </div>
                      {point.avgImpactScore > 0 && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#5A6478]">Avg Impact:</span>
                          <span className="tabular-nums font-medium text-[#7A5B1C]">
                            ★ {point.avgImpactScore} / 5.0
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />

            <ReferenceLine
              x={`${currentGrade}th Grade`}
              stroke="#5A6478"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Current (${currentGrade}th)`,
                position: 'top',
                fill: '#14233C',
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            {showAnnualBars && (
              <Bar
                dataKey="annualHours"
                name="Annual Hours"
                barSize={24}
                radius={[4, 4, 0, 0]}
                fill="#B8913A"
                fillOpacity={0.35}
              />
            )}

            <Area
              type="monotone"
              dataKey="cumulativeHours"
              name="Cumulative Hours"
              stroke="none"
              fill="url(#cumulativeNavyFill)"
            />

            <Line
              type="monotone"
              dataKey="cumulativeHours"
              name="Cumulative Hours"
              stroke="#14233C"
              strokeWidth={2.5}
              dot={{
                r: 4,
                fill: '#14233C',
                stroke: '#FFFFFF',
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: '#14233C',
                stroke: '#FFFFFF',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
