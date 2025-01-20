<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class FobiMarkerController extends Controller
{
    public function getMarkers(Request $request)
    {
        try {
            $query = DB::table('fobi_checklists');
            $queryKupunes = DB::table('fobi_checklists_kupnes');
            $queryTaxa = DB::table('fobi_checklist_taxas');

            // Filter berdasarkan sumber data
            if ($request->has('data_source')) {
                $sources = $request->data_source;
                if (!in_array('fobi', $sources)) {
                    return response()->json([]);
                }
            }

            // Filter berdasarkan tanggal
            if ($request->has('start_date')) {
                $query->where('created_at', '>=', $request->start_date);
                $queryKupunes->where('created_at', '>=', $request->start_date);
                $queryTaxa->where('created_at', '>=', $request->start_date);
            }

            if ($request->has('end_date')) {
                $query->where('created_at', '<=', $request->end_date);
                $queryKupunes->where('created_at', '<=', $request->end_date);
                $queryTaxa->where('created_at', '<=', $request->end_date);
            }

            // Filter berdasarkan grade
            if ($request->has('grade') && !empty($request->grade)) {
                $query->whereIn('grade', $request->grade);
                $queryKupunes->whereIn('grade', $request->grade);
                $queryTaxa->whereIn('grade', $request->grade);
            }

            // Filter berdasarkan media
            if ($request->has('has_media') && $request->has_media) {
                $query->whereNotNull('media_url');
                $queryKupunes->whereNotNull('media_url');
                $queryTaxa->whereNotNull('media_url');
            }

            if ($request->has('media_type')) {
                $query->where('media_type', $request->media_type);
                $queryKupunes->where('media_type', $request->media_type);
                $queryTaxa->where('media_type', $request->media_type);
            }

            // Filter berdasarkan lokasi dan radius
            if ($request->has(['latitude', 'longitude', 'radius'])) {
                $lat = $request->latitude;
                $lon = $request->longitude;
                $radius = $request->radius;

                $haversine = "(6371 * acos(cos(radians($lat))
                    * cos(radians(latitude))
                    * cos(radians(longitude) - radians($lon))
                    + sin(radians($lat))
                    * sin(radians(latitude))))";

                $query->whereRaw("{$haversine} <= ?", [$radius]);
                $queryKupunes->whereRaw("{$haversine} <= ?", [$radius]);
                $queryTaxa->whereRaw("{$haversine} <= ?", [$radius]);
            }

            // Ambil data sesuai filter
            $checklistsBurungnesia = $query->select(
                'latitude',
                'longitude',
                DB::raw("CONCAT('fobi_b_', id) as id"),
                'created_at',
                DB::raw("'burungnesia_fobi' as source")
            )->get();

            $checklistsKupunesia = $queryKupunes->select(
                'latitude',
                'longitude',
                DB::raw("CONCAT('fobi_k_', id) as id"),
                'created_at',
                DB::raw("'kupunesia_fobi' as source")
            )->get();

            $checklistsTaxa = $queryTaxa->select(
                'latitude',
                'longitude',
                DB::raw("CONCAT('fobi_t_', id) as id"),
                'created_at',
                DB::raw("'taxa_fobi' as source")
            )->get();

            $markers = $checklistsBurungnesia
                ->concat($checklistsKupunesia)
                ->concat($checklistsTaxa);

            return response()->json($markers);
        } catch (\Exception $e) {
            \Log::error('Error in FobiMarkerController:', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getSpeciesInChecklist($checklist_id, $source)
    {
        try {
            // Hapus prefix dari ID
            $originalId = preg_replace('/^fobi_(b|k|t)_/', '', $checklist_id);

            switch ($source) {
                case 'burungnesia_fobi':
                    $species = DB::table('fobi_checklist_faunasv1')
                        ->join('faunas', 'fobi_checklist_faunasv1.fauna_id', '=', 'faunas.id')
                        ->where('fobi_checklist_faunasv1.checklist_id', $originalId)
                        ->select(
                            'faunas.nameId',
                            'faunas.nameLat',
                            'faunas.id',
                            'fobi_checklist_faunasv1.count',
                            'fobi_checklist_faunasv1.notes'
                        )
                        ->get();
                    break;

                case 'kupunesia_fobi':
                    $species = DB::table('fobi_checklist_faunasv2')
                        ->join('faunas_kupnes', 'fobi_checklist_faunasv2.fauna_id', '=', 'faunas_kupnes.id')
                        ->where('fobi_checklist_faunasv2.checklist_id', $originalId)
                        ->select(
                            'faunas_kupnes.nameId',
                            'faunas_kupnes.nameLat',
                            'faunas_kupnes.id',
                            'fobi_checklist_faunasv2.count',
                            'fobi_checklist_faunasv2.notes'
                        )
                        ->get();
                    break;

                case 'taxa_fobi':
                    $species = DB::table('fobi_checklist_taxas')
                        ->where('id', $originalId)
                        ->select(
                            'species as nameId',
                            'genus as nameLat',
                            'family',
                            'genus',
                            'order',
                            'class',
                            'id',
                            DB::raw('1 as count'),
                            'observation_details as notes'
                        )
                        ->get();
                    break;

                default:
                    return response()->json(['error' => 'Invalid source'], 400);
            }

            return response()->json($species);
        } catch (\Exception $e) {
            \Log::error('Error in getSpeciesInChecklist:', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
