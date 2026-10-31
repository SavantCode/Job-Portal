import { createSlice } from "@reduxjs/toolkit";

const initialFilters = {
    keyword: "",
    location: "",
    industry: "",
    jobType: "",
    experience: "",
    salary: ""
};

const jobSlice = createSlice({
    name: "job",
    initialState: {
        allJobs: [],
        allAdminJobs: [],
        singleJob: null,
        searchJobByText: "",
        allAppliedJobs: [],
        searchedQuery: "",
        jobFilters: initialFilters
    },
    reducers: {
        setAllJobs: (state, action) => {
            state.allJobs = action.payload;
        },
        setSingleJob: (state, action) => {
            state.singleJob = action.payload;
        },
        setAllAdminJobs: (state, action) => {
            state.allAdminJobs = action.payload;
        },
        setSearchJobByText: (state, action) => {
            state.searchJobByText = action.payload;
        },
        setAllAppliedJobs: (state, action) => {
            state.allAppliedJobs = action.payload;
        },
        setSearchedQuery: (state, action) => {
            state.searchedQuery = action.payload;
        },
        setJobFilters: (state, action) => {
            state.jobFilters = { ...(state.jobFilters || initialFilters), ...action.payload };
        },
        resetJobFilters: (state) => {
            state.jobFilters = initialFilters;
            state.searchedQuery = "";
        }
    }
});

export const {
    setAllJobs,
    setSingleJob,
    setAllAdminJobs,
    setSearchJobByText,
    setAllAppliedJobs,
    setSearchedQuery,
    setJobFilters,
    resetJobFilters
} = jobSlice.actions;

export default jobSlice.reducer;