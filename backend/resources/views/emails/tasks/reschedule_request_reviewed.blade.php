@extends('emails.layouts.main')

@section('content')
    <h1>{{ $status === 'approved' ? '✅ Richiesta Spostamento Approvata' : '❌ Richiesta Spostamento Rifiutata' }}</h1>
    
    <p>Ciao <strong>{{ $request->user->name }}</strong>,</p>
    
    <p>
        @if($status === 'approved')
            La tua richiesta di spostamento scadenza per la task <strong>{{ $request->task->title }}</strong> è stata <strong style="color: #34C759;">approvata</strong>.
        @else
            La tua richiesta di spostamento scadenza per la task <strong>{{ $request->task->title }}</strong> è stata <strong style="color: #FF3B30;">rifiutata</strong>.
        @endif
    </p>
    
    <table class="data-table">
        <tr>
            <td class="data-label">Progetto</td>
            <td class="data-value">{{ $request->task->project->name ?? 'N/A' }}</td>
        </tr>
        @if($status === 'approved')
            <tr>
                <td class="data-label">Nuova Scadenza</td>
                <td class="data-value highlight">{{ \Carbon\Carbon::parse($request->requested_due_date)->format('d/m/Y') }}</td>
            </tr>
        @endif
        <tr>
            <td class="data-label">Revisore</td>
            <td class="data-value">{{ $reviewer->name ?? 'Admin' }}</td>
        </tr>
        <tr>
            <td class="data-label">Data Revisione</td>
            <td class="data-value">{{ \Carbon\Carbon::parse($request->reviewed_at)->format('d/m/Y H:i') }}</td>
        </tr>
    </table>

    @if($request->review_notes)
        <p style="font-size: 14px; color: #86868b; margin-bottom: 5px; margin-top: 20px;">Note del Revisore</p>
        <p style="background-color: #f5f5f7; padding: 15px; border-radius: 12px; font-size: 14px; margin-bottom: 30px;">
            {{ $request->review_notes }}
        </p>
    @endif

    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ config('app.frontend_url', 'https://backclub.it') }}/freelance/task/{{ $request->task->id }}" class="button">
            Vedi Task
        </a>
    </div>
@endsection
