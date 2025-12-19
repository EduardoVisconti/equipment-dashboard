'use client';

import { useQuery } from '@tanstack/react-query';
import { getEquipmentsList } from '@/data-access/equipments';
import { Equipment } from '@/types/equipment';

import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart';
import {
	Pie,
	PieChart,
	Bar,
	BarChart,
	Area,
	AreaChart,
	XAxis,
	YAxis,
	CartesianGrid
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsPage() {
	const { data: equipments = [] } = useQuery<Equipment[]>({
		queryKey: ['equipments'],
		queryFn: getEquipmentsList
	});

	/* ---------------- STATUS DATA ---------------- */

	const statusCounts = equipments.reduce((acc, eq) => {
		acc[eq.status] = (acc[eq.status] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	const statusChartData = Object.entries(statusCounts).map(
		([status, count]) => ({
			status,
			count
		})
	);

	/* ---------------- TIME SERIES DATA ---------------- */

	const monthlyCounts = equipments.reduce((acc, eq) => {
		const month = eq.purchaseDate.slice(0, 7); // YYYY-MM
		acc[month] = (acc[month] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	const timeSeriesData = Object.entries(monthlyCounts)
		.sort()
		.map(([month, total]) => ({
			month,
			total
		}));

	return (
		<section className='p-6 space-y-6'>
			<h1 className='text-2xl font-semibold'>Analytics</h1>

			<div className='grid gap-6 md:grid-cols-2'>
				{/* -------- PIE CHART -------- */}
				<Card>
					<CardHeader>
						<CardTitle>Equipments by Status</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={{
								active: { label: 'Active', color: '#22c55e' },
								inactive: { label: 'Inactive', color: '#eab308' },
								maintenance: { label: 'Maintenance', color: '#ef4444' }
							}}
							className='h-[300px]'
						>
							<PieChart>
								<Pie
									data={statusChartData}
									dataKey='count'
									nameKey='status'
									innerRadius={60}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
							</PieChart>
						</ChartContainer>
					</CardContent>
				</Card>

				{/* -------- BAR CHART -------- */}
				<Card>
					<CardHeader>
						<CardTitle>Status Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={{
								count: { label: 'Equipments', color: '#3b82f6' }
							}}
							className='h-[300px]'
						>
							<BarChart data={statusChartData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey='status' />
								<YAxis />
								<Bar
									dataKey='count'
									radius={4}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>

			{/* -------- AREA CHART -------- */}
			<Card>
				<CardHeader>
					<CardTitle>Equipments Over Time</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer
						config={{
							total: { label: 'Equipments', color: '#6366f1' }
						}}
						className='h-[350px]'
					>
						<AreaChart data={timeSeriesData}>
							<CartesianGrid vertical={false} />
							<XAxis dataKey='month' />
							<YAxis />
							<Area
								dataKey='total'
								type='monotone'
								fillOpacity={0.3}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
						</AreaChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</section>
	);
}
