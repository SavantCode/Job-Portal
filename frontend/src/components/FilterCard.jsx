import React, { useEffect, useState } from 'react'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Label } from './ui/label'
import { useDispatch } from 'react-redux'
import { setSearchedQuery } from '@/redux/jobSlice'
import { SlidersHorizontal, MapPin, Briefcase, IndianRupee, RotateCcw } from 'lucide-react'
import { Button } from './ui/button'

const fitlerData = [
    {
        fitlerType: "Location",
        array: ["Delhi NCR", "Bangalore", "Hyderabad", "Pune", "Mumbai"]
    },
    {
        fitlerType: "Industry",
        array: ["Frontend Developer", "Backend Developer", "FullStack Developer"]
    },
    {
        fitlerType: "Salary",
        array: ["0-40k", "42-1lakh", "1lakh to 5lakh"]
    },
]

const FilterCard = () => {
    const [selectedValue, setSelectedValue] = useState('');
    const dispatch = useDispatch();

    const changeHandler = (value) => {
        setSelectedValue(value);
    }

    const clearFilterHandler = () => {
        setSelectedValue('');
    }

    useEffect(() => {
        dispatch(setSearchedQuery(selectedValue));
    }, [selectedValue, dispatch]);

    // Helper icon selector for each filter category
    const getCategoryIcon = (type) => {
        switch (type) {
            case 'Location':
                return <MapPin className='w-4 h-4 text-[#6A38C2]' />;
            case 'Industry':
                return <Briefcase className='w-4 h-4 text-[#6A38C2]' />;
            case 'Salary':
                return <IndianRupee className='w-4 h-4 text-[#6A38C2]' />;
            default:
                return null;
        }
    };

    return (
        <div className='bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6'>
            {/* Header with Clear Option */}
            <div className='flex items-center justify-between pb-4 border-b border-gray-100'>
                <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-[#6A38C2]'>
                        <SlidersHorizontal className='w-4 h-4' />
                    </div>
                    <h1 className='font-bold text-lg text-gray-900'>Filters</h1>
                </div>
                {selectedValue && (
                    <Button 
                        onClick={clearFilterHandler} 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-[#6A38C2] flex items-center gap-1"
                    >
                        <RotateCcw className='w-3 h-3' />
                        <span>Clear</span>
                    </Button>
                )}
            </div>

            {/* Filter Radio Groups */}
            <RadioGroup value={selectedValue} onValueChange={changeHandler} className='space-y-6'>
                {
                    fitlerData.map((data, index) => (
                        <div key={index} className='space-y-3'>
                            <div className='flex items-center gap-2 text-gray-900 font-semibold text-sm'>
                                {getCategoryIcon(data.fitlerType)}
                                <span>{data.fitlerType}</span>
                            </div>
                            <div className='space-y-2 pl-1'>
                                {
                                    data.array.map((item, idx) => {
                                        const itemId = `id${index}-${idx}`
                                        return (
                                            <div key={itemId} className='flex items-center space-x-3 group cursor-pointer'>
                                                <RadioGroupItem 
                                                    value={item} 
                                                    id={itemId} 
                                                    className="border-gray-300 text-[#6A38C2] focus:ring-[#6A38C2]"
                                                />
                                                <Label 
                                                    htmlFor={itemId} 
                                                    className='text-sm text-gray-600 font-normal group-hover:text-gray-900 cursor-pointer transition-colors select-none'
                                                >
                                                    {item}
                                                </Label>
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        </div>
                    ))
                }
            </RadioGroup>
        </div>
    )
}

export default FilterCard