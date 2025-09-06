import { createClient } from "@/lib/supabase/server"
import { formatCurrency } from "@/lib/utils"

export async function getDashboardStats(userId: string) {
    const supabase = await createClient()

    // Get total raised from donations
    const { data: donations, error: donationsError } = await supabase
        .from("donations")
        .select("amount")
        .eq("user_id", userId)

    if (donationsError) {
        console.error("Error fetching donations:", donationsError)
        return {
            totalRaised: 0,
            totalDonors: 0,
            activeCauses: 0,
        }
    }

    const totalRaised = donations.reduce((sum, donation) => sum + donation.amount, 0)

    // Get total donors
    const { data: donors, error: donorsError } = await supabase
        .from("donations")
        .select("user_id", { count: "exact" })
        .eq("user_id", userId)
        .order("user_id")

    if (donorsError) {
        console.error("Error fetching donors:", donorsError)
        return {
            totalRaised,
            totalDonors: 0,
            activeCauses: 0,
        }
    }

    // Get active causes
    const { data: causes, error: causesError } = await supabase
        .from("causes")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "approved")

    if (causesError) {
        console.error("Error fetching causes:", causesError)
        return {
            totalRaised,
            totalDonors: donors?.length || 0,
            activeCauses: 0,
        }
    }

    return {
        totalRaised: formatCurrency(totalRaised),
        totalDonors: donors?.length || 0,
        activeCauses: causes?.length || 0,
    }
}

export async function getDonationTrends(userId: string) {
    const supabase = await createClient()

    // Get donations for the last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: donations, error } = await supabase
        .from("donations")
        .select("amount, created_at")
        .eq("user_id", userId)
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: true })

    if (error) {
        console.error("Error fetching donation trends:", error)
        return []
    }

    // Group donations by month
    const monthlyDonations = donations.reduce((acc, donation) => {
        const date = new Date(donation.created_at)
        const month = date.toLocaleString("default", { month: "short", year: "numeric" })

        if (!acc[month]) {
            acc[month] = 0
        }
        acc[month] += donation.amount
        return acc
    }, {} as Record<string, number>)

    // Convert to array format for chart
    return Object.entries(monthlyDonations).map(([month, amount]) => ({
        month,
        amount,
    }))
}

export async function getUserCauses(userId: string, status?: string) {
    const supabase = await createClient()

    let query = supabase
        .from("causes")
        .select("*")
        .eq("user_id", userId)

    if (status && status !== "all") {
        query = query.eq("status", status)
    }

    const { data: causes, error } = await query.order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching user causes:", error)
        return []
    }

    return causes
}

export async function getCauseAnalytics(causeId: string) {
    const supabase = await createClient()

    // Get total donations and donors for the cause
    const { data: donations, error: donationsError } = await supabase
        .from("donations")
        .select("amount, created_at,message, user_id")
        .eq("cause_id", causeId)

    if (donationsError) {
        console.error("Error fetching cause donations:", donationsError)
        return null
    }

    // Calculate total donations and unique donors
    const totalDonations = donations.reduce((sum, donation) => sum + donation.amount, 0)
    const uniqueDonors = new Set(donations.map(d => d.user_id)).size
    const averageDonation = uniqueDonors > 0 ? totalDonations / uniqueDonors : 0

    // Get cause details for completion percentage
    const { data: cause, error: causeError } = await supabase
        .from("causes")
        .select("goal,shared, created_at")
        .eq("id", causeId)
        .single()

    if (causeError) {
        console.error("Error fetching cause details:", causeError)
        return null
    }

    const completionPercentage = cause.goal > 0
        ? (totalDonations / cause.goal) * 100
        : 0

    // Calculate days active
    const daysActive = Math.ceil(
        (new Date().getTime() - new Date(cause.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Get daily donations for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyDonations = donations
        .filter(d => new Date(d.created_at) >= thirtyDaysAgo)
        .reduce((acc, donation) => {
            const date = new Date(donation.created_at).toISOString().split('T')[0]
            if (!acc[date]) {
                acc[date] = 0
            }
            acc[date] += donation.amount
            return acc
        }, {} as Record<string, number>)

    // Convert daily donations to array format
    const dailyDonationsArray = Object.entries(dailyDonations).map(([date, amount]) => ({
        date,
        amount
    }))

    // Get engagement metrics
    const engagement = {
        shares: cause.shared,
        comments: donations.filter(d => d.message && d.message.trim() !== '').length, // Count donations with non-empty messages as comments
        views: 0,
        conversionRate: cause.shared > 0 ? (uniqueDonors / cause.shared) * 100 : 0, // Calculate conversion rate based on shares to donors ratio
    }

    return {
        overview: {
            totalDonations,
            totalDonors: uniqueDonors,
            averageDonation,
            completionPercentage,
            daysActive,
        },
        donations: {
            daily: dailyDonationsArray,
        },
        engagement,
        comments: donations
            .filter(d => d.message && d.message.trim() !== '')
            .map(d => ({
                message: d.message,
                date: d.created_at,
                donorId: d.user_id
            }))
    }
} 