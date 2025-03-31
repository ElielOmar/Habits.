"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
// Add the Flask icon import at the top with the other icons
import { LayoutGrid, Plus, Edit, Trash2, ChevronLeft, ChevronRight, FlaskRoundIcon as Flask } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface HabitCompletion {
  date: string // ISO date string YYYY-MM-DD
  completed: boolean
}

interface Habit {
  id: number
  name: string
  completed: boolean
  history: HabitCompletion[]
}

type ViewMode = "daily" | "monthly" | "yearly"

export default function HabitTracker() {
  // Start with no habits
  const [habits, setHabits] = useState<Habit[]>([])
  const [progress, setProgress] = useState(0)
  const [currentPage, setCurrentPage] = useState<ViewMode>("daily")
  const [isAddingHabit, setIsAddingHabit] = useState(false)
  const [newHabitName, setNewHabitName] = useState("")
  const [editingHabitId, setEditingHabitId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Add the useState for theme mode after the other state declarations
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0]
  }

  // Get today's date formatted as YYYY-MM-DD
  const today = formatDate(currentDate)

  // Get days in month
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Generate array of dates for current month
  const getDatesForMonth = (year: number, month: number): string[] => {
    const daysInMonth = getDaysInMonth(year, month)
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1)
      return formatDate(date)
    })
  }

  // Get current month's dates
  const monthDates = getDatesForMonth(currentYear, currentMonth)

  // Check if a date is today
  const isToday = (dateString: string): boolean => {
    return dateString === today
  }

  // Check if a date is in the future
  const isFutureDate = (dateString: string): boolean => {
    return new Date(dateString) > new Date(today)
  }

  // Calculate monthly completion percentage for a habit
  const getMonthlyCompletionPercentage = (habit: Habit, year: number, month: number): number => {
    const dates = getDatesForMonth(year, month)
    const pastDates = dates.filter((date) => !isFutureDate(date))

    if (pastDates.length === 0) return 0

    const completedDays = pastDates.filter((date) => wasHabitCompletedOnDate(habit, date))
    return (completedDays.length / pastDates.length) * 100
  }

  // Simulate midnight reset - in a real app, this would be handled by the server or a background process
  useEffect(() => {
    // Check if it's a new day
    const checkForNewDay = () => {
      const now = new Date()
      const todayFormatted = formatDate(now)

      if (todayFormatted !== today) {
        // It's a new day, reset all habits
        setCurrentDate(now)
        setHabits((prevHabits) =>
          prevHabits.map((habit) => ({
            ...habit,
            completed: false,
          })),
        )
      }
    }

    // Check every minute
    const interval = setInterval(checkForNewDay, 60000)
    return () => clearInterval(interval)
  }, [today])

  useEffect(() => {
    if (habits.length === 0) {
      setProgress(0)
    } else {
      const completedCount = habits.filter((habit) => habit.completed).length
      const newProgress = (completedCount / habits.length) * 100
      setProgress(newProgress)
    }
  }, [habits])

  useEffect(() => {
    if (isAddingHabit && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingHabit])

  const toggleHabit = (id: number) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.id === id) {
          const newCompleted = !habit.completed

          // Update history
          const existingEntryIndex = habit.history.findIndex((entry) => entry.date === today)
          const newHistory = [...habit.history]

          if (existingEntryIndex >= 0) {
            // Update existing entry
            newHistory[existingEntryIndex] = { date: today, completed: newCompleted }
          } else {
            // Add new entry
            newHistory.push({ date: today, completed: newCompleted })
          }

          return {
            ...habit,
            completed: newCompleted,
            history: newHistory,
          }
        }
        return habit
      }),
    )
  }

  const addHabit = () => {
    if (newHabitName.trim()) {
      const newId = habits.length > 0 ? Math.max(...habits.map((h) => h.id)) + 1 : 1
      setHabits([
        ...habits,
        {
          id: newId,
          name: newHabitName.trim(),
          completed: false,
          history: [],
        },
      ])
      setNewHabitName("")
      setIsAddingHabit(false)
    }
  }

  const updateHabit = (id: number, newName: string) => {
    if (newName.trim()) {
      setHabits(habits.map((habit) => (habit.id === id ? { ...habit, name: newName.trim() } : habit)))
      setNewHabitName("")
      setEditingHabitId(null)
    }
  }

  const deleteHabit = (id: number) => {
    setHabits(habits.filter((habit) => habit.id !== id))
  }

  // Check if a habit was completed on a specific date
  const wasHabitCompletedOnDate = (habit: Habit, date: string): boolean => {
    const entry = habit.history.find((entry) => entry.date === date)
    return entry ? entry.completed : false
  }

  // Handle touch/mouse events for swipe
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ("touches" in e) {
      startXRef.current = e.touches[0].clientX
    } else {
      startXRef.current = e.clientX
    }
  }

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (startXRef.current === null) return

    let currentX: number
    if ("touches" in e) {
      currentX = e.touches[0].clientX
    } else {
      currentX = e.clientX
    }

    const diffX = startXRef.current - currentX

    // If swiping left and on daily page
    if (diffX > 50 && currentPage === "daily") {
      setCurrentPage("monthly")
      startXRef.current = null
    }
    // If swiping right and on monthly page
    else if (diffX < -50 && currentPage === "monthly") {
      setCurrentPage("daily")
      startXRef.current = null
    }
    // If swiping left and on monthly page
    else if (diffX > 50 && currentPage === "monthly") {
      setCurrentPage("yearly")
      startXRef.current = null
    }
    // If swiping right and on yearly page
    else if (diffX < -50 && currentPage === "yearly") {
      setCurrentPage("monthly")
      startXRef.current = null
    }
  }

  const handleTouchEnd = () => {
    startXRef.current = null
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (isAddingHabit) {
        addHabit()
      } else if (editingHabitId !== null) {
        updateHabit(editingHabitId, newHabitName)
      }
    } else if (e.key === "Escape") {
      setIsAddingHabit(false)
      setEditingHabitId(null)
      setNewHabitName("")
    }
  }

  // Get month name
  const getMonthName = (month: number): string => {
    return new Date(2000, month, 1).toLocaleString("default", { month: "long" })
  }

  // Get short month name
  const getShortMonthName = (month: number): string => {
    return new Date(2000, month, 1).toLocaleString("default", { month: "short" })
  }

  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  // Navigate to next month
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Navigate to previous year
  const goToPreviousYear = () => {
    setCurrentYear(currentYear - 1)
  }

  // Navigate to next year
  const goToNextYear = () => {
    setCurrentYear(currentYear + 1)
  }

  // Change page without animation
  const changePage = (newPage: ViewMode) => {
    setCurrentPage(newPage)
  }

  const getPageIndex = (): number => {
    switch (currentPage) {
      case "daily":
        return 0
      case "monthly":
        return 1
      case "yearly":
        return 2
      default:
        return 0
    }
  }

  // Add the toggleTheme function before the return statement
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    // Toggle the 'dark' class on the document element
    if (!isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return (
    // Update the main container div to include the dark mode class when active
    <div
      className={`flex justify-center items-center min-h-screen ${isDarkMode ? "dark bg-gray-900" : "bg-gray-200"} font-fragment-mono`}
    >
      <div
        className="max-w-md w-full mx-auto relative overflow-hidden"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* Theme Toggle Button - Positioned in the middle top */}
        <button
          onClick={toggleTheme}
          className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20"
          aria-label="Toggle theme"
        >
          <Flask className={`h-5 w-5 ${isDarkMode ? "text-purple-400" : "text-lime-500"}`} />
        </button>

        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${getPageIndex() * 100}%)` }}
        >
          {/* Daily View */}
          <div className="min-w-full">
            <div className="bg-white rounded-xl p-6 shadow-lg min-h-[600px] flex flex-col">
              <div className="flex justify-end mb-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none">
                      <LayoutGrid className="h-4 w-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setIsAddingHabit(true)
                        setIsDeleting(false)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      ADD
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setIsDeleting(false)
                        // If there's a habit being edited, cancel it
                        if (editingHabitId !== null) {
                          setEditingHabitId(null)
                          setNewHabitName("")
                        }
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      EDIT
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setIsDeleting(!isDeleting)
                        setIsAddingHabit(false)
                        setEditingHabitId(null)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      DELETE
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-grow flex flex-col justify-center items-center">
                {isAddingHabit && (
                  <div className="mb-4 w-full max-w-xs">
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="Enter habit name"
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="mb-2 font-fragment-mono"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addHabit} className="font-fragment-mono">
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsAddingHabit(false)
                          setNewHabitName("")
                        }}
                        className="font-fragment-mono"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {habits.length > 0 ? (
                  <div className="w-full max-w-xs">
                    <ul className="space-y-4 mb-4">
                      {habits.map((habit) => (
                        <li key={habit.id} className="flex items-center gap-3">
                          {!isDeleting && editingHabitId !== habit.id && (
                            <Checkbox
                              id={`habit-${habit.id}`}
                              checked={habit.completed}
                              onCheckedChange={() => toggleHabit(habit.id)}
                              className="border-lime-500 data-[state=checked]:bg-lime-500 data-[state=checked]:text-black"
                            />
                          )}

                          {editingHabitId === habit.id ? (
                            <div className="flex-1">
                              <Input
                                type="text"
                                value={newHabitName}
                                onChange={(e) => setNewHabitName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="mb-2 font-fragment-mono"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateHabit(habit.id, newHabitName)}
                                  className="font-fragment-mono"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingHabitId(null)
                                    setNewHabitName("")
                                  }}
                                  className="font-fragment-mono"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Label
                                htmlFor={`habit-${habit.id}`}
                                className={`text-lg flex-1 font-fragment-mono ${habit.completed && !isDeleting ? "line-through" : ""}`}
                                onClick={() => {
                                  if (!isDeleting && !habit.completed) {
                                    setEditingHabitId(habit.id)
                                    setNewHabitName(habit.name)
                                    setIsAddingHabit(false)
                                  }
                                }}
                              >
                                {habit.name}
                              </Label>

                              {isDeleting && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteHabit(habit.id)}
                                  className="font-fragment-mono"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>

                    <p className="text-lime-500 text-sm text-center font-fragment-mono">
                      Daily progress: {progress.toFixed(1)}%
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-gray-500">
                    <p className="mb-4 font-fragment-mono">No habits yet</p>
                    <Button
                      onClick={() => {
                        setIsAddingHabit(true)
                        setIsDeleting(false)
                      }}
                      className="flex items-center gap-2 font-fragment-mono"
                    >
                      <Plus className="h-4 w-4" />
                      Add your first habit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly View */}
          <div className="min-w-full">
            <div className="bg-white rounded-xl p-6 shadow-lg min-h-[600px]">
              <div className="flex justify-between mb-4 items-center">
                <div className="flex items-center">
                  <button onClick={goToPreviousMonth} className="mr-2 focus:outline-none">
                    <ChevronLeft className="h-4 w-4 text-gray-500" />
                  </button>
                  <h2 className="text-sm font-medium font-fragment-mono">
                    {getMonthName(currentMonth)} {currentYear}
                  </h2>
                  <button onClick={goToNextMonth} className="ml-2 focus:outline-none">
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none">
                      <LayoutGrid className="h-4 w-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => changePage("monthly")}>Monthly</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changePage("yearly")}>Yearly</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {habits.length > 0 ? (
                <div className="space-y-8 overflow-y-auto max-h-[500px]">
                  {habits.map((habit) => {
                    // Get days in current month
                    const daysInMonth = getDaysInMonth(currentYear, currentMonth)

                    // Split days into weeks for display
                    const weeks = []
                    for (let i = 0; i < daysInMonth; i += 7) {
                      weeks.push(monthDates.slice(i, i + 7))
                    }

                    return (
                      <div key={habit.id} className="space-y-2">
                        {weeks.map((week, weekIndex) => (
                          <div key={weekIndex} className="grid grid-cols-7 gap-1">
                            {week.map((date, dayIndex) => {
                              const isCompleted = wasHabitCompletedOnDate(habit, date)
                              const isFuture = isFutureDate(date)

                              return (
                                <div
                                  key={dayIndex}
                                  className={`w-6 h-6 border border-gray-300 ${
                                    isCompleted ? "bg-lime-500" : isFuture ? "bg-gray-100" : "bg-transparent"
                                  } ${isToday(date) ? "ring-2 ring-black" : ""}`}
                                  title={`${date}: ${isCompleted ? "Completed" : "Not completed"}`}
                                />
                              )
                            })}
                          </div>
                        ))}
                        <p className="text-xs text-gray-500 font-fragment-mono">{habit.name}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500">
                  <p className="font-fragment-mono">No habits to track yet</p>
                  <p className="text-sm mt-2 font-fragment-mono">Add habits on the daily view</p>
                </div>
              )}
            </div>
          </div>

          {/* Yearly View */}
          <div className="min-w-full">
            <div className="bg-white rounded-xl p-6 shadow-lg min-h-[600px]">
              <div className="flex justify-between mb-4 items-center">
                <div className="flex items-center">
                  <button onClick={goToPreviousYear} className="mr-2 focus:outline-none">
                    <ChevronLeft className="h-4 w-4 text-gray-500" />
                  </button>
                  <h2 className="text-sm font-medium font-fragment-mono">{currentYear}</h2>
                  <button onClick={goToNextYear} className="ml-2 focus:outline-none">
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none">
                      <LayoutGrid className="h-4 w-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => changePage("monthly")}>Monthly</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changePage("yearly")}>Yearly</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {habits.length > 0 ? (
                <div className="space-y-8 overflow-y-auto max-h-[500px]">
                  {habits.map((habit) => (
                    <div key={habit.id} className="space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 12 }, (_, month) => (
                          <div
                            key={month}
                            className="flex flex-col items-center p-2 border border-gray-200 rounded"
                            onClick={() => {
                              setCurrentMonth(month)
                              changePage("monthly")
                            }}
                          >
                            <span className="text-xs mb-1 font-fragment-mono">{getShortMonthName(month)}</span>
                            <div
                              className="w-full h-4 bg-gray-100 rounded-sm overflow-hidden"
                              title={`${getMonthlyCompletionPercentage(habit, currentYear, month).toFixed(0)}% completed`}
                            >
                              <div
                                className="h-full bg-lime-500"
                                style={{
                                  width: `${getMonthlyCompletionPercentage(habit, currentYear, month)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 font-fragment-mono">{habit.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500">
                  <p className="font-fragment-mono">No habits to track yet</p>
                  <p className="text-sm mt-2 font-fragment-mono">Add habits on the daily view</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page indicator dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <div
            className={`h-2 w-2 rounded-full ${currentPage === "daily" ? "bg-black" : "bg-gray-300"}`}
            onClick={() => changePage("daily")}
          />
          <div
            className={`h-2 w-2 rounded-full ${currentPage === "monthly" ? "bg-black" : "bg-gray-300"}`}
            onClick={() => changePage("monthly")}
          />
          <div
            className={`h-2 w-2 rounded-full ${currentPage === "yearly" ? "bg-black" : "bg-gray-300"}`}
            onClick={() => changePage("yearly")}
          />
        </div>
      </div>
    </div>
  )
}

