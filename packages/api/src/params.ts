export interface ListSeriesParams {
	page?: number;
	limit?: number;
	status?: string;
	tag?: string;
	search?: string;
	sort?: string;
}

export interface AdminListTasksParams {
	state?: string;
	page?: string;
	page_size?: string;
}

export interface AdminGetHistoryParams {
	days?: string;
}

export interface AdminListSeriesParams {
	page?: number;
	limit?: number;
	status?: string;
	search?: string;
	sort_by?: string;
	order?: string;
}
