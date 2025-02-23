"use client"

import React from 'react'
import { useUser } from '@supabase/auth-helpers-react'
import WorkoutProgrammer from './WorkoutProgrammer'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'

export default function WorkoutApp() {
  const user = useUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm p-6">
          <h1 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Sign in to Workout Programmer
          </h1>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#2563eb',
                  },
                },
              },
              style: {
                button: {
                  background: '#3b82f6',
                  borderRadius: '8px',
                  padding: '10px',
                },
                input: {
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: '8px',
                },
              },
            }}
            theme="dark"
            providers={['github', 'google']}
          />
        </div>
      </div>
    )
  }

  return <WorkoutProgrammer />
}