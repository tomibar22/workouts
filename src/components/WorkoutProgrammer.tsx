"use client"

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, Dumbbell, Target, Activity, X, Plus, Save, Loader2, LogOut } from 'lucide-react';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://nsrxmfudvgjbhuvtatxp.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcnhtZnVkdmdqYmh1dnRhdHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMDYxMjMsImV4cCI6MjA1NTg4MjEyM30.dPlggKcsE9vpasjxaI3D_gj967vV8U-x3LcBwsWPfwY"
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

interface Exercise {
  id: string;
  name: string;
  gifUrl: string;
  bodyPart: string;
  equipment: string;
  target: string;
  sets: number;
  reps: number;
  weight: number;
}

interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
  user_id: string;
  created_at: string;
}

interface WorkoutState {
  name: string;
  exercises: Exercise[];
}

interface Filters {
  bodyPart: string;
  equipment: string;
  target: string;
  search: string;
}

const WorkoutProgrammer: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [targetMuscles, setTargetMuscles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  const [filters, setFilters] = useState<Filters>({
    bodyPart: 'all',
    equipment: 'all',
    target: 'all',
    search: ''
  });

  const [currentWorkout, setCurrentWorkout] = useState<WorkoutState>({
    name: '',
    exercises: []
  });

  const [workouts, setWorkouts] = useState<Workout[]>([]);

  // API configuration
  const API_BASE = 'https://exercisedb.p.rapidapi.com/exercises';
  const API_KEY = '33dd98ace4msh868aeb43c6ceb9fp1ba196jsnf68435311c26';
  const API_HOST = 'exercisedb.p.rapidapi.com';

  const API_OPTIONS = useMemo(() => ({
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': API_HOST
    }
  }), []);

  // Check for session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load workouts from Supabase
  useEffect(() => {
    const loadWorkouts = async () => {
      if (!session?.user) return;
      
      try {
        const { data, error } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWorkouts(data || []);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error loading workouts:', error);
          setError('Failed to load saved workouts');
        }
      }
    };


    loadWorkouts();
  }, [session]);

  // Add this after your existing useEffects
useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const bodyPartsRes = await fetch(`${API_BASE}/bodyPartList`, API_OPTIONS);
        const bodyPartsData = await bodyPartsRes.json();
        setBodyParts(['all', ...bodyPartsData]);
  
        const equipmentRes = await fetch(`${API_BASE}/equipmentList`, API_OPTIONS);
        const equipmentData = await equipmentRes.json();
        setEquipment(['all', ...equipmentData]);
  
        const targetRes = await fetch(`${API_BASE}/targetList`, API_OPTIONS);
        const targetData = await targetRes.json();
        setTargetMuscles(['all', ...targetData]);
  
        const exercisesRes = await fetch(`${API_BASE}`, API_OPTIONS);
        const exercisesData = await exercisesRes.json();
        setExercises(exercisesData);
  
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [API_OPTIONS]);

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         exercise.target.toLowerCase().includes(filters.search.toLowerCase());
    const matchesBodyPart = filters.bodyPart === 'all' || exercise.bodyPart === filters.bodyPart;
    const matchesEquipment = filters.equipment === 'all' || exercise.equipment === filters.equipment;
    const matchesTarget = filters.target === 'all' || exercise.target === filters.target;
  
    return matchesSearch && matchesBodyPart && matchesEquipment && matchesTarget;
  });

  // Example of a typed function:
  const addExercise = (exercise: Exercise): void => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, { 
        ...exercise, 
        sets: 3, 
        reps: 10,
        weight: 0 
      }]
    }));
  };

  const removeExercise = (index: number): void => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const updateExerciseDetails = (index: number, field: keyof Pick<Exercise, 'sets' | 'reps' | 'weight'>, value: string): void => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((exercise, i) => 
        i === index ? { ...exercise, [field]: parseInt(value) || 0 } : exercise
      )
    }));
  };

  const saveWorkout = async (): Promise<void> => {
    if (!session?.user) {
      alert('Please sign in to save workouts');
      return;
    }

    if (currentWorkout.name && currentWorkout.exercises.length > 0) {
      setIsSaving(true);
      try {
        const { data, error } = await supabase
          .from('workouts')
          .insert([
            {
              user_id: session.user.id,
              name: currentWorkout.name,
              exercises: currentWorkout.exercises
            }
          ])
          .select()
          .single();

        if (error) throw error;

        setWorkouts(prev => [data, ...prev]);
        setCurrentWorkout({ name: '', exercises: [] });
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error saving workout:', error);
          alert('Failed to save workout');
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSignOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="flex items-center gap-3 bg-gray-800 p-4 rounded-lg shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-lg">Loading your workout experience...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-2xl mx-auto bg-red-900/20 border border-red-500/20 rounded-lg p-6 text-red-400">
          <h2 className="text-xl font-semibold mb-2">Error Loading Exercises</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-6 space-y-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Workout Programmer
          </h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
        
        {/* Workout Name Input */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Name your workout..."
            className="w-full p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
            value={currentWorkout.name}
            onChange={(e) => setCurrentWorkout(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search exercises..."
              className="w-full pl-10 p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filters.bodyPart}
              onChange={(e) => setFilters(prev => ({ ...prev, bodyPart: e.target.value }))}
              className="w-full pl-10 p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 capitalize appearance-none"
            >
              {bodyParts.map(part => (
                <option key={part} value={part} className="capitalize bg-gray-800">
                  {part === 'all' ? 'All Body Parts' : part}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Dumbbell className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filters.equipment}
              onChange={(e) => setFilters(prev => ({ ...prev, equipment: e.target.value }))}
              className="w-full pl-10 p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 capitalize appearance-none"
            >
              {equipment.map(item => (
                <option key={item} value={item} className="capitalize bg-gray-800">
                  {item === 'all' ? 'All Equipment' : item}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filters.target}
              onChange={(e) => setFilters(prev => ({ ...prev, target: e.target.value }))}
              className="w-full pl-10 p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 capitalize appearance-none"
            >
              {targetMuscles.map(muscle => (
                <option key={muscle} value={muscle} className="capitalize bg-gray-800">
                  {muscle === 'all' ? 'All Target Muscles' : muscle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Exercise List */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="p-6 border-b border-gray-700/50">
              <h2 className="text-xl font-semibold text-blue-400 flex items-center justify-between">
                <span>Exercise Database</span>
                <span className="text-sm px-3 py-1 bg-blue-500/10 rounded-full text-blue-400">
                  {filteredExercises.length} exercises
                </span>
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">
                {filteredExercises.map(exercise => (
                  <div key={exercise.id} className="group bg-gray-700/50 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-300 flex flex-col h-72">
                    <div className="bg-gray-800/50 w-full h-40 overflow-hidden relative">
                      <Image 
                        src={exercise.gifUrl} 
                        alt={exercise.name}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-exercise.png';
                        }}
                      />
                    </div>
                    <div className="p-3 flex flex-col flex-grow">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-sm mb-2 line-clamp-2">{exercise.name}</h3>
                        <button
                          onClick={() => addExercise(exercise)}
                          className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition-colors group-hover:scale-105 duration-300 flex-shrink-0 ml-2"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="mt-auto space-y-0.5">
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Target size={12} /> {exercise.target}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Dumbbell size={12} /> {exercise.equipment}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Activity size={12} /> {exercise.bodyPart}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Current Workout */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="p-6 border-b border-gray-700/50">
              <h2 className="text-xl font-semibold text-blue-400">Current Workout</h2>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {currentWorkout.exercises.map((exercise, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-300">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-medium text-lg mb-1">{exercise.name}</h3>
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <Activity size={16} /> {exercise.bodyPart}
                            <span className="mx-2">•</span>
                            <Target size={16} /> {exercise.target}
                          </p>
                        </div>
                        <button
                          onClick={() => removeExercise(index)}
                          className="text-red-400 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg overflow-hidden mb-4 relative h-40">
                        <Image 
                          src={exercise.gifUrl} 
                          alt={exercise.name}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-exercise.png';
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            placeholder="Sets"
                            value={exercise.sets}
                            onChange={(e) => updateExerciseDetails(index, 'sets', e.target.value)}
                            className="w-full p-2 bg-gray-800/50 rounded-lg border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                          />
                          <span className="absolute -top-2 left-2 px-2 bg-gray-800 text-xs text-gray-400">
                            Sets
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            placeholder="Reps"
                            value={exercise.reps}
                            onChange={(e) => updateExerciseDetails(index, 'reps', e.target.value)}
                            className="w-full p-2 bg-gray-800/50 rounded-lg border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                          />
                          <span className="absolute -top-2 left-2 px-2 bg-gray-800 text-xs text-gray-400">
                            Reps
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Weight"
                            value={exercise.weight}
                            onChange={(e) => updateExerciseDetails(index, 'weight', e.target.value)}
                            className="w-full p-2 bg-gray-800/50 rounded-lg border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                          />
                          <span className="absolute -top-2 left-2 px-2 bg-gray-800 text-xs text-gray-400">
                            Weight (kg)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={saveWorkout}
                  disabled={!currentWorkout.name || currentWorkout.exercises.length === 0 || isSaving}
                  className="w-full mt-6 bg-blue-600 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Save Workout
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Workouts */}
        <div className="mt-8 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold text-blue-400">Saved Workouts</h2>
          </div>
          <div className="p-4">
            <div className="grid gap-4">
              {workouts.map(workout => (
                <div key={workout.id} className="bg-gray-700/50 rounded-lg p-6 hover:bg-gray-700 transition-all duration-300">
                  <h3 className="font-bold text-xl mb-4 text-blue-400">{workout.name}</h3>
                  <div className="grid gap-4">
                    {workout.exercises.map((exercise, index) => (
                      <div key={index} className="flex items-center gap-4 bg-gray-800/50 rounded-lg p-3">
                        <div className="w-20 h-20 bg-gray-900/50 rounded-lg overflow-hidden flex-shrink-0 relative">
                          <Image 
                            src={exercise.gifUrl} 
                            alt={exercise.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 80px, 80px"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-exercise.png';
                            }}
                          />
                        </div>
                        <div className="flex-grow">
                          <p className="font-medium text-lg mb-2">{exercise.name}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm px-2 py-1 bg-blue-500/10 rounded text-blue-400">
                              {exercise.sets} sets
                            </span>
                            <span className="text-sm px-2 py-1 bg-blue-500/10 rounded text-blue-400">
                              {exercise.reps} reps
                            </span>
                            {exercise.weight > 0 && (
                              <span className="text-sm px-2 py-1 bg-blue-500/10 rounded text-blue-400">
                                {exercise.weight}kg
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutProgrammer;