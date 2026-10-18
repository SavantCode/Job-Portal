import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import { Button } from './ui/button';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setSearchedQuery } from '@/redux/jobSlice';

const category = [
    "Frontend Developer",
    "Backend Developer",
    "FullStack Developer",
    "Data Science",
    "AI/ML Engineer",
    "Mobile App Developer",
    "DevOps Engineer",
    "UI/UX Designer",
    "Graphic Designer",
    "Cloud Architect",
    "Cybersecurity Analyst",
    "Product Manager"
];

const CategoryCarousel = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const searchJobHandler = (query) => {
        dispatch(setSearchedQuery(query));
        navigate("/browse");
    }

    return (
        <div className='w-full py-12 bg-gray-50/50 border-y border-gray-100 my-16'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8'>
                <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900'>
                    Explore Popular <span className='text-[#6A38C2]'>Job Categories</span>
                </h2>
                <p className='text-sm text-muted-foreground mt-1'>
                    Click on any category to instantly filter and browse top opportunities.
                </p>
            </div>

            <Carousel className="w-full max-w-4xl mx-auto px-12 sm:px-16">
                <CarouselContent className="-ml-2 md:-ml-4">
                    {
                        category.map((cat, index) => (
                            <CarouselItem key={index} className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 lg:basis-1/4">
                                <Button 
                                    onClick={() => searchJobHandler(cat)} 
                                    variant="outline" 
                                    className="w-full h-11 rounded-full border-gray-200 bg-white hover:bg-purple-50 hover:text-[#6A38C2] hover:border-purple-200 font-medium text-sm transition-all shadow-xs"
                                >
                                    {cat}
                                </Button>
                            </CarouselItem>
                        ))
                    }
                </CarouselContent>
                <CarouselPrevious className="absolute -left-4 sm:-left-6 h-10 w-10 rounded-full border-gray-200 bg-white shadow-md hover:bg-gray-50" />
                <CarouselNext className="absolute -right-4 sm:-right-6 h-10 w-10 rounded-full border-gray-200 bg-white shadow-md hover:bg-gray-50" />
            </Carousel>
        </div>
    )
}

export default CategoryCarousel;