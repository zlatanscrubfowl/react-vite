<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderFauna;
use App\Models\Fauna;
use App\Models\Taxontest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class HomeController extends Controller
{
    public function getOrderFaunas()
    {
        $orderFaunas = OrderFauna::orderBy('ordo_order')->orderBy('famili_order')->get()->keyBy('famili');
        return response()->json($orderFaunas);
    }

    public function getChecklists()
    {
        $checklistsAka = DB::connection('second')->table('checklists')
            ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
            ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
            ->select('checklists.latitude', 'checklists.longitude', 'checklists.id', 'checklists.created_at', DB::raw("'burungnesia' as source"))
            ->groupBy('checklists.latitude', 'checklists.longitude', 'checklists.id', 'checklists.created_at')
            ->get();

        $checklistsKupnes = DB::connection('third')->table('checklists')
            ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
            ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
            ->select('checklists.latitude', 'checklists.longitude', 'checklists.id', 'checklists.created_at', DB::raw("'kupunesia' as source"))
            ->groupBy('checklists.latitude', 'checklists.longitude', 'checklists.id', 'checklists.created_at')
            ->get();

        $checklists = $checklistsAka->merge($checklistsKupnes);
        return response()->json($checklists);
    }

    public function getFamilies()
    {
        $families = Fauna::select('family')->distinct()->get();
        $orderFaunas = OrderFauna::orderBy('ordo_order')->orderBy('famili_order')->get()->keyBy('famili');

        $families = $families->map(function ($family) use ($orderFaunas) {
            $family->ordo = $orderFaunas->get($family->family)->ordo ?? null;
            return $family;
        });

        return response()->json($families);
    }

    public function getOrdos()
    {
        $ordos = OrderFauna::select('ordo')->distinct()->get();
        return response()->json($ordos);
    }

    public function getFaunas()
    {
        $faunas = Fauna::all();
        return response()->json($faunas);
    }

    public function getTaxontest()
    {
        $taxontest = Taxontest::all();
        return response()->json($taxontest);
    }

    public function getBurungnesiaCount()
    {
        $burungnesiaCount = DB::connection('second')->table('checklist_fauna')->count();
        return response()->json(['burungnesiaCount' => $burungnesiaCount]);
    }

    public function getKupunesiaCount()
    {
        $kupunesiaCount = DB::connection('third')->table('checklist_fauna')->count();
        return response()->json(['kupunesiaCount' => $kupunesiaCount]);
    }

    public function getFobiCount()
    {
        $fobiCount = DB::table('fobi_checklist_taxas')->count();
        return response()->json(['fobiCount' => $fobiCount]);
    }

    public function getUserBurungnesiaCount($userId)
    {
        $userBurungnesiaCount = 0;
        $fobiUser = DB::table('fobi_users')->where('id', $userId)->first();
        if ($fobiUser) {
            $secondCount = DB::connection('second')->table('checklists')
                ->where('user_id', $fobiUser->burungnesia_user_id)
                ->count();

            $fobiCount = DB::table('fobi_checklists')
                ->where('fobi_user_id', $userId)
                ->count();

            $userBurungnesiaCount = $secondCount + $fobiCount;
        }
        return response()->json(['userBurungnesiaCount' => $userBurungnesiaCount]);
    }

    public function getUserKupunesiaCount($userId)
    {
        $userKupunesiaCount = 0;
        $fobiUser = DB::table('fobi_users')->where('id', $userId)->first();
        if ($fobiUser) {
            $thirdCount = DB::connection('third')->table('checklists')
                ->where('user_id', $fobiUser->kupunesia_user_id)
                ->count();

            $fobiKupnesCount = DB::table('fobi_checklists_kupnes')
                ->where('fobi_user_id', $userId)
                ->count();

            $userKupunesiaCount = $thirdCount + $fobiKupnesCount;
        }
        return response()->json(['userKupunesiaCount' => $userKupunesiaCount]);
    }

    public function getUserTotalObservations($userId)
    {
        $cacheKey = "user_total_observations_{$userId}";
        $cacheDuration = 30; // Cache selama 30 detik karena tidak ada polling
    
        return Cache::remember($cacheKey, $cacheDuration, function() use ($userId) {
            $userBurungnesiaCount = 0;
            $userKupunesiaCount = 0;
            $fobiCount = 0;
            
            $fobiUser = DB::table('fobi_users')->where('id', $userId)->first();

            if ($fobiUser) {
                $secondCount = DB::connection('second')
                    ->table('checklists')
                    ->where('user_id', $fobiUser->burungnesia_user_id)
                    ->count();

                $fobiBirdCount = DB::table('fobi_checklists')
                    ->where('fobi_user_id', $userId)
                    ->count();

                $userBurungnesiaCount = $secondCount + $fobiBirdCount;

                $thirdCount = DB::connection('third')
                    ->table('checklists')
                    ->where('user_id', $fobiUser->kupunesia_user_id)
                    ->count();

                $fobiKupnesCount = DB::table('fobi_checklists_kupnes')
                    ->where('fobi_user_id', $userId)
                    ->count();

                $userKupunesiaCount = $thirdCount + $fobiKupnesCount;
            }

            $fobiCount = DB::table('fobi_checklist_taxas')
                ->where('user_id', $userId)
                ->count();

            $total = $userBurungnesiaCount + $userKupunesiaCount + $fobiCount;

            return response()->json([
                'userTotalObservations' => $total,
                'timestamp' => now()->timestamp
            ]);
        });
    }

    public function getTotalSpecies()
    {
        $totalSpeciesSecond = DB::connection('second')->table('checklist_fauna')->distinct('fauna_id')->count('fauna_id');
        $totalSpeciesThird = DB::connection('third')->table('checklist_fauna')->distinct('fauna_id')->count('fauna_id');
        $totalSpeciesMain = DB::table('fobi_checklist_taxas')->distinct('taxa_id')->count('taxa_id');

        $totalSpeciesTaxas = DB::table('taxas')
            ->where('taxon_rank', 'species')
            ->where('status', 'active')
            ->count();

        $totalSpecies = $totalSpeciesSecond + $totalSpeciesThird + $totalSpeciesMain + $totalSpeciesTaxas;

        return response()->json(['totalSpecies' => $totalSpecies]);
    }
    public function getTotalContributors()
    {
        $totalContributors = DB::table('fobi_users')->count();
        return response()->json(['totalContributors' => $totalContributors]);
    }
}
